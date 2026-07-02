import {
  ErrorCodes,
  PLAN_SLUGS,
  type PaidPlanSlug,
  type TenantSubscriptionDto
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { assertTenantAllowsOperations } from "../../../common/tenant/assert-tenant-operations.util";
import { BLOCKED_WRITE_STATUSES } from "../subscription.constants";
import { SubscriptionLifecycleService } from "./subscription-lifecycle.service";
import { SubscriptionNotificationsService } from "./subscription-notifications.service";
import { toSubscriptionDto, type SubscriptionWithPlan } from "./subscriptions.mapper";

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private notifications: SubscriptionNotificationsService,
    private lifecycle: SubscriptionLifecycleService
  ) {}

  private db() {
    return generatedPrisma(this.prisma);
  }

  private async loadSubscriptionOrThrow(tenantId: string): Promise<SubscriptionWithPlan> {
    const subscription = await this.db().tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true }
    });
    if (!subscription) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Organization subscription not found",
        HttpStatus.NOT_FOUND
      );
    }
    return subscription;
  }

  async getSubscriptionForTenant(tenantId: string): Promise<TenantSubscriptionDto> {
    const subscription = await this.loadSubscriptionOrThrow(tenantId);
    return toSubscriptionDto(subscription);
  }

  async assertSubscriptionAllowsWrites(tenantId: string): Promise<void> {
    await assertTenantAllowsOperations(this.prisma, tenantId);
    const subscription = await this.loadSubscriptionOrThrow(tenantId);
    if (BLOCKED_WRITE_STATUSES.has(subscription.status)) {
      throw new DomainException(
        ErrorCodes.PAYMENT_REQUIRED,
        "Subscription payment is required to perform this action",
        HttpStatus.PAYMENT_REQUIRED,
        { status: subscription.status }
      );
    }
  }

  async notifyTrialEnding(tenantId: string): Promise<void> {
    const subscription = await this.loadSubscriptionOrThrow(tenantId);
    await this.notifications.notifyTrialEnding(tenantId, subscription);
  }

  async ensureSubscriptionForTenant(
    tenantId: string,
    planSlug: string = PLAN_SLUGS.PILOT,
    status: TenantSubscriptionDto["status"] = "active"
  ): Promise<TenantSubscriptionDto> {
    const existing = await this.db().tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true }
    });
    if (existing) {
      return toSubscriptionDto(existing);
    }

    const plan = await this.db().plan.findUnique({ where: { slug: planSlug } });
    if (!plan) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        `Plan not found: ${planSlug}`,
        HttpStatus.NOT_FOUND
      );
    }

    const trialEndsAt =
      status === "trial"
        ? (() => {
            const end = new Date();
            end.setDate(end.getDate() + 30);
            return end;
          })()
        : null;

    const now = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

    const created = await this.db().tenantSubscription.create({
      data: {
        tenantId,
        planId: plan.id,
        status,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd,
        billingInterval: "monthly",
        billingSource: "manual",
        planAssignedAt: now
      },
      include: { plan: true }
    });

    await this.lifecycle.recordEvent(tenantId, {
      eventType: "created",
      fromPlanId: null,
      toPlanId: plan.id,
      fromStatus: null,
      toStatus: status,
      actorType: "system",
      metadata: { billingInterval: "monthly" }
    });

    return toSubscriptionDto(created);
  }

  async changePlan(tenantId: string, planSlug: PaidPlanSlug): Promise<TenantSubscriptionDto> {
    const subscription = await this.loadSubscriptionOrThrow(tenantId);
    const plan = await this.db().plan.findUnique({ where: { slug: planSlug } });
    if (!plan) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        `Plan not found: ${planSlug}`,
        HttpStatus.NOT_FOUND
      );
    }

    if (subscription.planId === plan.id) {
      return toSubscriptionDto(subscription);
    }

    const now = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

    const updated = await this.db().tenantSubscription.update({
      where: { tenantId },
      data: {
        planId: plan.id,
        status: "active",
        trialEndsAt: null,
        currentPeriodStart: now,
        currentPeriodEnd,
        billingInterval: "monthly",
        billingSource: "simulated"
      },
      include: { plan: true }
    });

    await this.lifecycle.recordEvent(tenantId, {
      eventType: "plan_changed",
      fromPlanId: subscription.planId,
      toPlanId: plan.id,
      fromStatus: subscription.status,
      toStatus: "active",
      actorType: "tenant_owner",
      metadata: { billingInterval: "monthly" }
    });

    return toSubscriptionDto(updated);
  }
}
