import {
  ErrorCodes,
  type ListPlatformSubscriptionsQuery,
  type PlatformSubscriptionDetailDto,
  type PlatformSubscriptionEventDto,
  type PlatformSubscriptionListItemDto,
  type PlatformSubscriptionListResponseDto,
  type PlatformSubscriptionWorkQueueDto
} from "@kloqra/contracts";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../../../prisma/generated/client";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { SubscriptionSyncService } from "../../subscriptions/application/subscription-sync.service";
import { StripeClient } from "../../subscriptions/stripe/stripe.client";

@Injectable()
export class PlatformSubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private stripe: StripeClient,
    private sync: SubscriptionSyncService
  ) {}

  private db() {
    return generatedPrisma(this.prisma);
  }

  private async getDriftTenantIds(): Promise<Set<string>> {
    if (!this.stripe.isConfigured()) return new Set();
    const drift = new Set<string>();
    try {
      const rows = await this.db().tenantSubscription.findMany({
        where: { stripeSubscriptionId: { not: null } },
        select: { tenantId: true, stripeSubscriptionId: true, status: true }
      });
      const stripe = this.stripe.getClient();
      await Promise.all(
        rows.map(async (row) => {
          if (!row.stripeSubscriptionId) return;
          try {
            const stripeSub = await stripe.subscriptions.retrieve(row.stripeSubscriptionId);
            const mapped = this.sync.mapStripeStatus(stripeSub.status);
            if (mapped !== row.status) {
              drift.add(row.tenantId);
            }
          } catch {
            drift.add(row.tenantId);
          }
        })
      );
    } catch {
      // Ignore
    }
    return drift;
  }

  private resolveWorkItem(
    sub: { status: string; trialEndsAt: Date | null },
    openInquiries: Array<{ tenantId: string; status: string }>,
    driftTenantIds: Set<string>,
    tenantId: string
  ): PlatformSubscriptionListItemDto["workItem"] {
    if (sub.status === "past_due") {
      return "past_due";
    }

    if (sub.status === "trial" && sub.trialEndsAt) {
      const now = new Date();
      const diffTime = sub.trialEndsAt.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 7) {
        return "trial_ending";
      }
    }

    const tenantInquiry = openInquiries.find((inq) => inq.tenantId === tenantId);
    if (tenantInquiry) {
      if (tenantInquiry.status === "receipt_submitted") {
        return "sales_receipt_submitted";
      }
      if (tenantInquiry.status === "open" || tenantInquiry.status === "awaiting_receipt") {
        return "sales_open";
      }
    }

    if (driftTenantIds.has(tenantId)) {
      return "drift";
    }

    return null;
  }

  async listSubscriptions(
    query: ListPlatformSubscriptionsQuery
  ): Promise<PlatformSubscriptionListResponseDto> {
    const db = this.db();
    const { page, limit, search, status, planSlug, billingSource, renewingWithinDays, workItem } =
      query;

    // We fetch drift and open inquiries to support filtering and resolve work items
    const driftTenantIds = await this.getDriftTenantIds();
    const openInquiries = await db.tenantSalesInquiry.findMany({
      where: { status: { in: ["open", "awaiting_receipt", "receipt_submitted"] } },
      select: { id: true, tenantId: true, status: true }
    });

    const where: Prisma.TenantSubscriptionWhereInput = {};

    if (search) {
      where.tenant = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } }
        ]
      };
    }

    if (status) {
      where.status = status;
    }

    if (planSlug) {
      where.plan = { slug: planSlug };
    }

    if (billingSource) {
      where.billingSource = billingSource;
    }

    if (renewingWithinDays !== undefined) {
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + renewingWithinDays);
      where.currentPeriodEnd = {
        gte: now,
        lte: future
      };
    }

    if (workItem) {
      if (workItem === "past_due") {
        where.status = "past_due";
      } else if (workItem === "trial_ending") {
        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + 7);
        where.status = "trial";
        where.trialEndsAt = {
          gte: now,
          lte: future
        };
      } else if (workItem === "sales_open") {
        where.tenant = {
          salesInquiries: {
            some: { status: { in: ["open", "awaiting_receipt"] } }
          }
        };
      } else if (workItem === "sales_receipt_submitted") {
        where.tenant = {
          salesInquiries: {
            some: { status: "receipt_submitted" }
          }
        };
      } else if (workItem === "drift") {
        where.tenantId = { in: Array.from(driftTenantIds) };
      }
    }

    const [total, subs] = await Promise.all([
      db.tenantSubscription.count({ where }),
      db.tenantSubscription.findMany({
        where,
        orderBy: { currentPeriodEnd: "asc" }, // Renewing soonest first
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tenant: true,
          plan: true
        }
      })
    ]);

    const now = new Date();
    const items = subs.map((sub) => {
      const daysOnPlan = Math.max(
        0,
        Math.floor((now.getTime() - sub.planAssignedAt.getTime()) / (1000 * 60 * 60 * 24))
      );

      const tenantInquiry = openInquiries.find((inq) => inq.tenantId === sub.tenantId);

      return {
        tenantId: sub.tenantId,
        tenantName: sub.tenant.name,
        tenantSlug: sub.tenant.slug,
        tenantStatus: sub.tenant.status as any,
        planId: sub.planId,
        planName: sub.plan.name,
        planSlug: sub.plan.slug,
        status: sub.status as any,
        billingInterval: sub.billingInterval,
        currentPeriodStart: sub.currentPeriodStart ? sub.currentPeriodStart.toISOString() : null,
        currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
        trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
        planAssignedAt: sub.planAssignedAt.toISOString(),
        billingSource: sub.billingSource,
        daysOnPlan,
        workItem: this.resolveWorkItem(sub, openInquiries, driftTenantIds, sub.tenantId),
        salesInquiryId: tenantInquiry?.id || null
      };
    });

    return {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      items
    };
  }

  async getSubscriptionDetail(tenantId: string): Promise<PlatformSubscriptionDetailDto> {
    const db = this.db();
    const sub = await db.tenantSubscription.findUnique({
      where: { tenantId },
      include: {
        tenant: true,
        plan: true,
        events: {
          orderBy: { occurredAt: "desc" },
          take: 50,
          include: {
            tenant: true
          }
        }
      }
    });

    if (!sub) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: "Subscription not found"
      });
    }

    // Resolve plan names for events fromPlanId/toPlanId
    const planIds = new Set<string>();
    sub.events.forEach((e) => {
      if (e.fromPlanId) planIds.add(e.fromPlanId);
      if (e.toPlanId) planIds.add(e.toPlanId);
    });

    const plans = await db.plan.findMany({
      where: { id: { in: Array.from(planIds) } },
      select: { id: true, name: true }
    });
    const planMap = new Map(plans.map((p) => [p.id, p.name]));

    const driftTenantIds = await this.getDriftTenantIds();
    const openInquiries = await db.tenantSalesInquiry.findMany({
      where: { tenantId, status: { in: ["open", "awaiting_receipt", "receipt_submitted"] } },
      select: { id: true, tenantId: true, status: true }
    });

    const now = new Date();
    const daysOnPlan = Math.max(
      0,
      Math.floor((now.getTime() - sub.planAssignedAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    const events: PlatformSubscriptionEventDto[] = sub.events.map((e) => ({
      id: e.id,
      tenantId: e.tenantId,
      subscriptionId: e.subscriptionId,
      eventType: e.eventType,
      occurredAt: e.occurredAt.toISOString(),
      fromPlanId: e.fromPlanId,
      fromPlanName: e.fromPlanId ? planMap.get(e.fromPlanId) : null,
      toPlanId: e.toPlanId,
      toPlanName: e.toPlanId ? planMap.get(e.toPlanId) : null,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actorType: e.actorType as any,
      actorId: e.actorId,
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString()
    }));

    const tenantInquiry = openInquiries.find((inq) => inq.tenantId === sub.tenantId);

    return {
      tenantId: sub.tenantId,
      tenantName: sub.tenant.name,
      tenantSlug: sub.tenant.slug,
      tenantStatus: sub.tenant.status as any,
      planId: sub.planId,
      planName: sub.plan.name,
      planSlug: sub.plan.slug,
      status: sub.status as any,
      billingInterval: sub.billingInterval,
      currentPeriodStart: sub.currentPeriodStart ? sub.currentPeriodStart.toISOString() : null,
      currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
      trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
      planAssignedAt: sub.planAssignedAt.toISOString(),
      billingSource: sub.billingSource,
      daysOnPlan,
      workItem: this.resolveWorkItem(sub, openInquiries, driftTenantIds, sub.tenantId),
      stripeCustomerId: sub.stripeCustomerId,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      limitsOverride: sub.limitsOverride as any,
      events,
      salesInquiryId: tenantInquiry?.id || null
    };
  }

  async getWorkQueue(): Promise<PlatformSubscriptionWorkQueueDto> {
    const db = this.db();
    const now = new Date();
    const weekOut = new Date();
    weekOut.setDate(weekOut.getDate() + 7);

    // 1. Fetch counts
    const driftTenantIds = await this.getDriftTenantIds();

    const [pastDueCount, trialEndingCount, salesPendingCount, receiptReviewCount] =
      await Promise.all([
        db.tenantSubscription.count({ where: { status: "past_due" } }),
        db.tenantSubscription.count({
          where: { status: "trial", trialEndsAt: { gte: now, lte: weekOut } }
        }),
        db.tenantSalesInquiry.count({
          where: { status: { in: ["open", "awaiting_receipt"] } }
        }),
        db.tenantSalesInquiry.count({
          where: { status: "receipt_submitted" }
        })
      ]);

    // 2. Fetch all subscriptions that have ANY workItem to populate the queue
    const openInquiries = await db.tenantSalesInquiry.findMany({
      where: { status: { in: ["open", "awaiting_receipt", "receipt_submitted"] } },
      select: { id: true, tenantId: true, status: true }
    });

    const activeWorkItemTenantIds = new Set<string>([
      ...Array.from(driftTenantIds),
      ...openInquiries.map((inq) => inq.tenantId)
    ]);

    const subs = await db.tenantSubscription.findMany({
      where: {
        OR: [
          { status: "past_due" },
          { status: "trial", trialEndsAt: { gte: now, lte: weekOut } },
          { tenantId: { in: Array.from(activeWorkItemTenantIds) } }
        ]
      },
      include: {
        tenant: true,
        plan: true
      }
    });

    const items: PlatformSubscriptionListItemDto[] = subs
      .map((sub) => {
        const daysOnPlan = Math.max(
          0,
          Math.floor((now.getTime() - sub.planAssignedAt.getTime()) / (1000 * 60 * 60 * 24))
        );
        const tenantInquiry = openInquiries.find((inq) => inq.tenantId === sub.tenantId);

        return {
          tenantId: sub.tenantId,
          tenantName: sub.tenant.name,
          tenantSlug: sub.tenant.slug,
          tenantStatus: sub.tenant.status as any,
          planId: sub.planId,
          planName: sub.plan.name,
          planSlug: sub.plan.slug,
          status: sub.status as any,
          billingInterval: sub.billingInterval,
          currentPeriodStart: sub.currentPeriodStart ? sub.currentPeriodStart.toISOString() : null,
          currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
          trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
          planAssignedAt: sub.planAssignedAt.toISOString(),
          billingSource: sub.billingSource,
          daysOnPlan,
          workItem: this.resolveWorkItem(sub, openInquiries, driftTenantIds, sub.tenantId),
          salesInquiryId: tenantInquiry?.id || null
        };
      })
      .filter((item) => item.workItem !== null); // Only items with actual work actions

    return {
      counts: {
        pastDue: pastDueCount,
        trialEnding: trialEndingCount,
        salesPending: salesPendingCount,
        receiptReview: receiptReviewCount,
        drift: driftTenantIds.size
      },
      items
    };
  }

  async getSubscriptionEvents(
    tenantId: string,
    query: { page: number; limit: number }
  ): Promise<{ items: PlatformSubscriptionEventDto[]; total: number; totalPages: number }> {
    const db = this.db();
    const { page, limit } = query;

    const where = { tenantId };

    const [total, events] = await Promise.all([
      db.tenantSubscriptionEvent.count({ where }),
      db.tenantSubscriptionEvent.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    // Resolve plan names
    const planIds = new Set<string>();
    events.forEach((e) => {
      if (e.fromPlanId) planIds.add(e.fromPlanId);
      if (e.toPlanId) planIds.add(e.toPlanId);
    });

    const plans = await db.plan.findMany({
      where: { id: { in: Array.from(planIds) } },
      select: { id: true, name: true }
    });
    const planMap = new Map(plans.map((p) => [p.id, p.name]));

    const items: PlatformSubscriptionEventDto[] = events.map((e) => ({
      id: e.id,
      tenantId: e.tenantId,
      subscriptionId: e.subscriptionId,
      eventType: e.eventType,
      occurredAt: e.occurredAt.toISOString(),
      fromPlanId: e.fromPlanId,
      fromPlanName: e.fromPlanId ? planMap.get(e.fromPlanId) : null,
      toPlanId: e.toPlanId,
      toPlanName: e.toPlanId ? planMap.get(e.toPlanId) : null,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actorType: e.actorType as any,
      actorId: e.actorId,
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString()
    }));

    return {
      items,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit)
    };
  }
}
