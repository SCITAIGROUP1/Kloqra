import {
  ErrorCodes,
  listPlatformTenantsQuerySchema,
  type CreatePlatformTenantDto,
  type CreatePlatformTenantResponseDto,
  type DeleteTenantResponseDto,
  type PlatformTenantDetailDto,
  type PlatformTenantListResponseDto,
  type UpdatePlatformTenantDto
} from "@kloqra/contracts";
import { HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import type { z } from "zod";
import type { Prisma } from "../../../../prisma/generated/client";
import { DomainException } from "../../../common/errors/domain.exception";
import { TenantOwnerProvisioningMailer } from "../../../common/mailer/tenant-owner-provisioning.mailer";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TenantProvisioningService } from "../../../common/tenant/tenant-provisioning.service";
// eslint-disable-next-line no-restricted-imports
import { AuthService } from "../../auth/application/auth.service";
import { resolveBillingAlert } from "../../subscriptions/application/billing-alert.util";
import { SubscriptionLifecycleService } from "../../subscriptions/application/subscription-lifecycle.service";
import { SubscriptionSalesInquiryService } from "../../subscriptions/application/subscription-sales-inquiry.service";
import { StripeClient } from "../../subscriptions/stripe/stripe.client";
import { PlatformAuditService, type PlatformAuditContext } from "./platform-audit.service";
import { PlatformNotificationsDispatchService } from "./platform-notifications-dispatch.service";
import {
  notifyTenantChurned,
  notifyTenantCreated,
  notifyTenantDeleted,
  notifyTenantSuspended,
  notifyTenantUpdated
} from "./platform-notifications.helper";

type ListQuery = z.infer<typeof listPlatformTenantsQuerySchema>;
type UpdateAuditKind = "default" | "suspend";

@Injectable()
export class PlatformTenantsService {
  constructor(
    private prisma: PrismaService,
    private ownerMailer: TenantOwnerProvisioningMailer,
    private auth: AuthService,
    private stripe: StripeClient,
    private audit: PlatformAuditService,
    private provisioning: TenantProvisioningService,
    private platformNotifications: PlatformNotificationsDispatchService,
    private salesInquiries: SubscriptionSalesInquiryService,
    private lifecycle: SubscriptionLifecycleService
  ) {}

  private db() {
    return generatedPrisma(this.prisma);
  }

  async listTenants(query: ListQuery): Promise<PlatformTenantListResponseDto> {
    const db = this.db();
    const { page, limit, search, status, planSlug, subscriptionStatus } = query;

    const where: Prisma.TenantWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } }
      ];
    }
    if (status) {
      where.status = status;
    }
    if (planSlug || subscriptionStatus) {
      where.subscription = {
        ...(planSlug ? { plan: { slug: planSlug } } : {}),
        ...(subscriptionStatus ? { status: subscriptionStatus } : {})
      };
    }

    const [total, tenants] = await Promise.all([
      db.tenant.count({ where }),
      db.tenant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { workspaces: true, members: true } }
        }
      })
    ]);

    return {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      items: tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status as PlatformTenantListResponseDto["items"][number]["status"],
        createdAt: tenant.createdAt.toISOString(),
        planSlug: tenant.subscription?.plan.slug,
        subscriptionStatus: tenant.subscription?.status as
          | PlatformTenantListResponseDto["items"][number]["subscriptionStatus"]
          | undefined,
        workspaceCount: tenant._count.workspaces,
        memberCount: tenant._count.members
      }))
    };
  }

  async getTenant(id: string): Promise<PlatformTenantDetailDto> {
    const tenant = await this.loadTenantDetailRow(id);
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: "Tenant not found"
      });
    }
    return this.toTenantDetail(tenant);
  }

  async createTenant(
    dto: CreatePlatformTenantDto,
    ctx: PlatformAuditContext
  ): Promise<CreatePlatformTenantResponseDto> {
    const db = this.db();
    const email = dto.ownerEmail.trim().toLowerCase();
    const organizationName = dto.organizationName.trim();

    const plan = await db.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Plan not found", HttpStatus.NOT_FOUND);
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await db.tenantMember.findUnique({
        where: { userId: existingUser.id }
      });
      if (existingMember) {
        throw new DomainException(
          ErrorCodes.ALREADY_IN_ORGANIZATION,
          "Owner email already belongs to an organization",
          HttpStatus.CONFLICT
        );
      }
    }

    const tenantAdminEmail = dto.tenantAdminEmail?.trim().toLowerCase();
    if (tenantAdminEmail) {
      const existingAdminUser = await this.prisma.user.findUnique({
        where: { email: tenantAdminEmail }
      });
      if (existingAdminUser) {
        const existingMember = await db.tenantMember.findUnique({
          where: { userId: existingAdminUser.id }
        });
        if (existingMember) {
          throw new DomainException(
            ErrorCodes.ALREADY_IN_ORGANIZATION,
            "Tenant admin email already belongs to an organization",
            HttpStatus.CONFLICT
          );
        }
      }
    }

    const ownerName = dto.ownerName?.trim() || organizationName;
    const subscriptionStatus = dto.subscriptionStatus ?? "trial";

    const result = await this.provisioning.provisionTenant({
      mode: "platform",
      organizationName,
      ownerEmail: email,
      ownerName,
      planId: plan.id,
      subscriptionStatus,
      limitsOverride: dto.limitsOverride ?? undefined,
      firstWorkspace: dto.firstWorkspace
        ? { name: dto.firstWorkspace.name.trim(), slug: dto.firstWorkspace.slug }
        : undefined,
      ...(tenantAdminEmail ? { tenantAdminEmail } : {})
    });

    const temporaryPassword = result.temporaryPassword;
    if (!temporaryPassword) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Platform provisioning did not return a temporary password",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    void this.ownerMailer
      .sendOwnerCredentials({
        to: email,
        organizationName,
        temporaryPassword
      })
      .catch(() => undefined);

    if (tenantAdminEmail && result.tenantAdminTemporaryPassword) {
      void this.ownerMailer
        .sendTenantAdminCredentials({
          to: tenantAdminEmail,
          organizationName,
          inviterName: "Kloqra Platform",
          temporaryPassword: result.tenantAdminTemporaryPassword
        })
        .catch(() => undefined);
    }

    const tenant = await this.getTenant(result.tenantId);
    const includeDevPassword = process.env.NODE_ENV !== "production";

    await this.audit.recordEvent({
      context: ctx,
      action: "platform.tenant.created",
      tenantId: result.tenantId,
      summary: {
        organizationName,
        slug: tenant.slug,
        ownerEmail: email,
        planId: dto.planId,
        ...(tenantAdminEmail ? { tenantAdminEmail } : {}),
        ...(dto.firstWorkspace ? { firstWorkspaceName: dto.firstWorkspace.name.trim() } : {})
      }
    });

    notifyTenantCreated(this.platformNotifications, {
      tenantId: result.tenantId,
      name: organizationName,
      slug: tenant.slug,
      excludePlatformUserId: ctx.actorPlatformUserId
    });

    return {
      tenant,
      ownerUserId: result.ownerUserId,
      ...(includeDevPassword ? { temporaryPassword } : {}),
      ...(result.tenantAdminUserId ? { tenantAdminUserId: result.tenantAdminUserId } : {}),
      ...(includeDevPassword && result.tenantAdminTemporaryPassword
        ? { tenantAdminTemporaryPassword: result.tenantAdminTemporaryPassword }
        : {})
    };
  }

  async updateTenant(
    id: string,
    dto: UpdatePlatformTenantDto,
    ctx: PlatformAuditContext,
    auditKind: UpdateAuditKind = "default"
  ): Promise<PlatformTenantDetailDto> {
    const db = this.db();
    const tenant = await db.tenant.findUnique({
      where: { id },
      include: { subscription: true }
    });
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: "Tenant not found"
      });
    }

    if (dto.status === "churned") {
      await this.assertCanChurn(tenant);
    }

    const effectiveSubscriptionStatus =
      dto.subscriptionStatus ?? (dto.status === "suspended" ? ("suspended" as const) : undefined);

    if (dto.planId) {
      const plan = await db.plan.findUnique({ where: { id: dto.planId } });
      if (!plan) {
        throw new DomainException(ErrorCodes.NOT_FOUND, "Plan not found", HttpStatus.NOT_FOUND);
      }
    }

    if (dto.slug && dto.slug !== tenant.slug) {
      const slugTaken = await db.tenant.findUnique({ where: { slug: dto.slug } });
      if (slugTaken) {
        throw new DomainException(
          ErrorCodes.CONFLICT,
          "Organization slug is already taken",
          HttpStatus.CONFLICT
        );
      }
    }

    const openInquiry = dto.planId
      ? await db.tenantSalesInquiry.findFirst({
          where: {
            tenantId: id,
            requestedPlanId: dto.planId,
            status: { in: ["open", "awaiting_receipt", "receipt_submitted"] }
          },
          orderBy: { createdAt: "desc" }
        })
      : null;

    const billingInterval = openInquiry?.billingInterval || "monthly";
    const now = new Date();
    const currentPeriodEnd = new Date();
    if (billingInterval === "yearly") {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }

    await this.prisma.$transaction(async (tx) => {
      const gtx = generatedPrisma(tx);
      const settings =
        dto.exportWaived === true
          ? {
              ...(typeof tenant.settings === "object" && tenant.settings !== null
                ? (tenant.settings as Record<string, unknown>)
                : {}),
              exportWaivedAt: new Date().toISOString()
            }
          : undefined;

      await gtx.tenant.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.status === "churned" ? { churnedAt: new Date() } : {}),
          ...(settings !== undefined ? { settings } : {})
        }
      });

      if (
        tenant.subscription &&
        (dto.planId !== undefined ||
          effectiveSubscriptionStatus !== undefined ||
          dto.limitsOverride !== undefined)
      ) {
        const oldPlanId = tenant.subscription.planId;
        const newPlanId = dto.planId !== undefined ? dto.planId : oldPlanId;
        const oldStatus = tenant.subscription.status;
        const newStatus =
          effectiveSubscriptionStatus !== undefined ? effectiveSubscriptionStatus : oldStatus;

        await gtx.tenantSubscription.update({
          where: { tenantId: id },
          data: {
            ...(dto.planId !== undefined
              ? {
                  planId: dto.planId,
                  billingInterval,
                  billingSource: "manual",
                  currentPeriodStart: now,
                  currentPeriodEnd
                }
              : {}),
            ...(effectiveSubscriptionStatus !== undefined
              ? { status: effectiveSubscriptionStatus }
              : {}),
            ...(dto.limitsOverride !== undefined
              ? { limitsOverride: dto.limitsOverride as object | null }
              : {})
          } as Prisma.TenantSubscriptionUncheckedUpdateInput
        });

        if (oldPlanId !== newPlanId) {
          await this.lifecycle.recordEvent(
            id,
            {
              eventType: "plan_changed",
              fromPlanId: oldPlanId,
              toPlanId: newPlanId,
              fromStatus: oldStatus,
              toStatus: newStatus,
              actorType: "platform_user",
              actorId: ctx.actorPlatformUserId,
              metadata: {
                reason: "Manual platform admin plan change",
                salesInquiryId: openInquiry?.id || null,
                billingInterval
              }
            },
            tx
          );
        } else if (oldStatus !== newStatus) {
          await this.lifecycle.recordEvent(
            id,
            {
              eventType: "status_changed",
              fromStatus: oldStatus,
              toStatus: newStatus,
              actorType: "platform_user",
              actorId: ctx.actorPlatformUserId,
              metadata: { reason: "Manual platform admin status change" }
            },
            tx
          );
        }
      }

      if (dto.status === "suspended") {
        await this.revokeTenantUserTokens(id, tx);
        await this.revokeTenantReportingApiKeys(id, tx);
      }

      if (dto.status === "churned") {
        await this.revokeTenantReportingApiKeys(id, tx);
      }
    });

    if (dto.planId !== undefined && dto.planId !== tenant.subscription?.planId) {
      await this.salesInquiries.fulfillOpenInquiryForPlan(id, dto.planId);
    }

    const summary = this.buildUpdateAuditSummary(id, tenant, dto);
    if (auditKind === "suspend") {
      await this.audit.recordEvent({
        context: ctx,
        action: "platform.tenant.suspended",
        tenantId: id,
        summary: { tenantId: id, priorStatus: tenant.status }
      });
    } else if (dto.status === "churned") {
      await this.audit.recordEvent({
        context: ctx,
        action: "platform.tenant.churned",
        tenantId: id,
        summary: { tenantId: id, priorStatus: tenant.status }
      });
    } else if (Object.keys(summary).length > 1) {
      await this.audit.recordEvent({
        context: ctx,
        action: "platform.tenant.updated",
        tenantId: id,
        summary
      });
    }

    const updated = await this.getTenant(id);
    const excludePlatformUserId = ctx.actorPlatformUserId;
    if (auditKind === "suspend" || dto.status === "suspended") {
      notifyTenantSuspended(this.platformNotifications, {
        tenantId: id,
        name: updated.name,
        excludePlatformUserId
      });
    } else if (dto.status === "churned") {
      notifyTenantChurned(this.platformNotifications, {
        tenantId: id,
        name: updated.name,
        excludePlatformUserId
      });
    } else if (Object.keys(summary).length > 1) {
      notifyTenantUpdated(this.platformNotifications, {
        tenantId: id,
        name: updated.name,
        excludePlatformUserId
      });
    }

    return updated;
  }

  async suspendTenant(id: string, ctx: PlatformAuditContext): Promise<PlatformTenantDetailDto> {
    return this.updateTenant(
      id,
      { status: "suspended", subscriptionStatus: "suspended" },
      ctx,
      "suspend"
    );
  }

  async deleteTenant(id: string, ctx: PlatformAuditContext): Promise<DeleteTenantResponseDto> {
    const tenant = await this.db().tenant.findUnique({
      where: { id },
      include: { subscription: true }
    });
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: "Tenant not found"
      });
    }

    await this.assertCanHardDelete(tenant);

    await this.audit.recordEvent({
      context: ctx,
      action: "platform.tenant.deleted",
      tenantId: id,
      summary: {
        tenantId: id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        churnedAt: tenant.churnedAt?.toISOString() ?? null
      }
    });

    await this.db().tenant.delete({ where: { id } });

    notifyTenantDeleted(this.platformNotifications, {
      tenantId: id,
      name: tenant.name,
      excludePlatformUserId: ctx.actorPlatformUserId
    });

    return { ok: true, deletedTenantId: id };
  }

  private buildUpdateAuditSummary(
    tenantId: string,
    tenant: {
      name: string;
      slug: string;
      status: string;
      subscription: { planId: string; limitsOverride: unknown } | null;
    },
    dto: UpdatePlatformTenantDto
  ): Record<string, unknown> {
    const summary: Record<string, unknown> = { tenantId };

    if (dto.name !== undefined && dto.name !== tenant.name) {
      summary.name = { from: tenant.name, to: dto.name };
    }
    if (dto.slug !== undefined && dto.slug !== tenant.slug) {
      summary.slug = { from: tenant.slug, to: dto.slug };
    }
    if (dto.status !== undefined && dto.status !== tenant.status) {
      summary.status = { from: tenant.status, to: dto.status };
    }
    if (dto.planId !== undefined && dto.planId !== tenant.subscription?.planId) {
      summary.planId = { from: tenant.subscription?.planId ?? null, to: dto.planId };
    }
    if (dto.subscriptionStatus !== undefined) {
      summary.subscriptionStatus = dto.subscriptionStatus;
    }
    if (dto.limitsOverride !== undefined) {
      summary.limitsOverride = dto.limitsOverride;
    }
    if (dto.exportWaived !== undefined) {
      summary.exportWaived = dto.exportWaived;
    }

    return summary;
  }

  private async assertCanHardDelete(tenant: {
    id: string;
    status: string;
    churnedAt: Date | null;
    settings: unknown;
    subscription: { stripeSubscriptionId: string | null; status: string } | null;
  }): Promise<void> {
    if (tenant.status !== "churned") {
      throw new DomainException(
        ErrorCodes.TENANT_DELETE_PRECONDITION_FAILED,
        "Tenant must be churned before permanent deletion",
        HttpStatus.BAD_REQUEST
      );
    }

    const stripeSubscriptionId = tenant.subscription?.stripeSubscriptionId;
    if (stripeSubscriptionId && this.stripe.isConfigured()) {
      const stripeSub = await this.stripe.getClient().subscriptions.retrieve(stripeSubscriptionId);
      if (stripeSub.status !== "canceled") {
        throw new DomainException(
          ErrorCodes.TENANT_DELETE_PRECONDITION_FAILED,
          "Stripe subscription must be canceled before permanent deletion",
          HttpStatus.BAD_REQUEST,
          { stripeStatus: stripeSub.status }
        );
      }
    } else if (tenant.subscription && tenant.subscription.status !== "canceled") {
      throw new DomainException(
        ErrorCodes.TENANT_DELETE_PRECONDITION_FAILED,
        "Subscription must be canceled before permanent deletion",
        HttpStatus.BAD_REQUEST
      );
    }

    const settings =
      typeof tenant.settings === "object" && tenant.settings !== null
        ? (tenant.settings as Record<string, unknown>)
        : {};
    const exportWaived = typeof settings.exportWaivedAt === "string";

    if (!exportWaived) {
      const completedExport = await this.db().tenantDataExportJob.findFirst({
        where: { tenantId: tenant.id, status: "ready" },
        orderBy: { completedAt: "desc" }
      });
      if (!completedExport) {
        throw new DomainException(
          ErrorCodes.EXPORT_WAIVED_REQUIRED,
          "Complete a tenant data export or waive export in writing before deletion",
          HttpStatus.BAD_REQUEST
        );
      }
    }

    const minDays = Number.parseInt(process.env.TENANT_DELETE_MIN_DAYS_AFTER_CHURN ?? "30", 10);
    const churnedAt = tenant.churnedAt ?? new Date(0);
    const eligibleAt = new Date(churnedAt);
    eligibleAt.setUTCDate(eligibleAt.getUTCDate() + minDays);
    if (new Date() < eligibleAt) {
      throw new DomainException(
        ErrorCodes.TENANT_DELETE_PRECONDITION_FAILED,
        `Retention period of ${minDays} days after churn has not elapsed`,
        HttpStatus.BAD_REQUEST,
        { eligibleAt: eligibleAt.toISOString() }
      );
    }
  }

  private async assertCanChurn(tenant: {
    status: string;
    subscription: { stripeSubscriptionId: string | null; status: string } | null;
  }): Promise<void> {
    if (tenant.status !== "suspended") {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Tenant must be suspended before churning",
        HttpStatus.BAD_REQUEST
      );
    }

    const stripeSubscriptionId = tenant.subscription?.stripeSubscriptionId;
    if (!stripeSubscriptionId) {
      return;
    }

    if (this.stripe.isConfigured()) {
      const stripeSub = await this.stripe.getClient().subscriptions.retrieve(stripeSubscriptionId);
      if (stripeSub.status !== "canceled") {
        throw new DomainException(
          ErrorCodes.VALIDATION_ERROR,
          "Cancel the Stripe subscription before churning this tenant",
          HttpStatus.BAD_REQUEST,
          { stripeStatus: stripeSub.status }
        );
      }
      return;
    }

    if (tenant.subscription?.status !== "canceled") {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Stripe subscription must be canceled before churning this tenant",
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private async revokeTenantUserTokens(
    tenantId: string,
    tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0]
  ): Promise<void> {
    const members = await generatedPrisma(tx).tenantMember.findMany({
      where: { tenantId },
      select: { userId: true }
    });
    for (const member of members) {
      await this.auth.revokeAllRefreshTokens(member.userId);
    }
  }

  private async revokeTenantReportingApiKeys(
    tenantId: string,
    tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0]
  ): Promise<void> {
    await generatedPrisma(tx).reportingApiCredential.deleteMany({
      where: { workspace: { tenantId } }
    });
  }

  private async loadTenantDetailRow(id: string) {
    return this.db().tenant.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
        members: {
          where: { role: "OWNER", isActive: true },
          include: { user: { select: { email: true } } },
          take: 1
        },
        _count: { select: { workspaces: true, members: true } }
      }
    });
  }

  private toTenantDetail(
    tenant: NonNullable<Awaited<ReturnType<typeof this.loadTenantDetailRow>>>
  ) {
    const subscription = tenant.subscription;
    const billingAlert = subscription
      ? resolveBillingAlert({
          status: subscription.status,
          trialEndsAt: subscription.trialEndsAt
        })
      : null;

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status as PlatformTenantDetailDto["status"],
      createdAt: tenant.createdAt.toISOString(),
      planSlug: subscription?.plan.slug,
      subscriptionStatus: subscription?.status as PlatformTenantDetailDto["subscriptionStatus"],
      workspaceCount: tenant._count.workspaces,
      memberCount: tenant._count.members,
      ownerEmail: tenant.members[0]?.user.email ?? null,
      subscription: subscription
        ? {
            planName: subscription.plan.name,
            planSlug: subscription.plan.slug,
            status: subscription.status as NonNullable<
              PlatformTenantDetailDto["subscription"]
            >["status"],
            trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
            billingAlert: billingAlert ?? undefined,
            currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
            billingInterval: subscription.billingInterval,
            planAssignedAt: subscription.planAssignedAt.toISOString(),
            billingSource: subscription.billingSource
          }
        : null
    };
  }
}
