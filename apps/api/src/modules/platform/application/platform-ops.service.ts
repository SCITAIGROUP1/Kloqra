import type { PlatformOpsSummaryDto } from "@kloqra/contracts";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";
import { SubscriptionSyncService } from "../../subscriptions/application/subscription-sync.service";
import { StripeClient } from "../../subscriptions/stripe/stripe.client";
import { PlatformNotificationsDispatchService } from "./platform-notifications-dispatch.service";
import { notifyQueueFailures, notifySubscriptionDrift } from "./platform-notifications.helper";

const OPS_ALERT_COOLDOWN_MS = 60 * 60 * 1000;
const opsAlertLastSent = new Map<string, number>();

type TenantStatusKey = keyof PlatformOpsSummaryDto["tenants"];
type SubscriptionStatusKey = keyof PlatformOpsSummaryDto["subscriptions"];

const TENANT_STATUS_KEYS: Record<string, TenantStatusKey | undefined> = {
  active: "active",
  suspended: "suspended",
  churned: "churned",
  pending_setup: "pendingSetup"
};

const SUBSCRIPTION_STATUS_KEYS: Record<string, SubscriptionStatusKey | undefined> = {
  active: "active",
  trial: "trial",
  past_due: "pastDue",
  canceled: "canceled"
};

@Injectable()
export class PlatformOpsService {
  constructor(
    private prisma: PrismaService,
    private stripe: StripeClient,
    private sync: SubscriptionSyncService,
    private platformNotifications: PlatformNotificationsDispatchService,
    @InjectQueue(QUEUES.MAIL) private mailQueue: Queue,
    @InjectQueue(QUEUES.BULK_INVITE) private bulkInviteQueue: Queue,
    @InjectQueue(QUEUES.BULK_CATEGORY) private bulkCategoryQueue: Queue,
    @InjectQueue(QUEUES.EXPORT) private exportQueue: Queue
  ) {}

  private db() {
    return generatedPrisma(this.prisma);
  }

  async getOpsSummary(): Promise<PlatformOpsSummaryDto> {
    const checkedAt = new Date();
    const [tenantRows, subscriptionRows, totalWorkspaces, totalSeats, queues, mrr, driftCount] =
      await Promise.all([
        this.db().tenant.groupBy({ by: ["status"], _count: { _all: true } }),
        this.db().tenantSubscription.groupBy({ by: ["status"], _count: { _all: true } }),
        this.prisma.workspace.count(),
        this.countFleetSeats(),
        this.getQueueCounts(),
        this.fetchStripeMrr(),
        this.countSubscriptionDrift()
      ]);

    const tenants = {
      active: 0,
      trial: 0,
      suspended: 0,
      churned: 0,
      pendingSetup: 0
    };
    for (const row of tenantRows) {
      const key = TENANT_STATUS_KEYS[row.status];
      if (key) tenants[key] = row._count._all;
    }

    const trialSubscriptionCount =
      subscriptionRows.find((row) => row.status === "trial")?._count._all ?? 0;
    tenants.trial = trialSubscriptionCount;

    const subscriptions = {
      active: 0,
      trial: 0,
      pastDue: 0,
      canceled: 0
    };
    for (const row of subscriptionRows) {
      const key = SUBSCRIPTION_STATUS_KEYS[row.status];
      if (key) subscriptions[key] = row._count._all;
    }

    const summary = {
      tenants,
      subscriptions,
      usage: { totalWorkspaces, totalSeats },
      queues,
      mrr,
      reconcile: {
        driftCount,
        lastCheckedAt: checkedAt.toISOString()
      }
    };

    this.maybeNotifyOpsAlerts(summary);

    return summary;
  }

  private maybeNotifyOpsAlerts(summary: PlatformOpsSummaryDto): void {
    if (summary.reconcile.driftCount > 0 && this.shouldNotifyOpsAlert("drift")) {
      notifySubscriptionDrift(this.platformNotifications, {
        driftCount: summary.reconcile.driftCount
      });
    }

    for (const [queueName, counts] of Object.entries(summary.queues)) {
      if (counts.failed > 0 && this.shouldNotifyOpsAlert(`queue:${queueName}`)) {
        notifyQueueFailures(this.platformNotifications, {
          queueName,
          failedCount: counts.failed
        });
      }
    }
  }

  private shouldNotifyOpsAlert(key: string): boolean {
    const now = Date.now();
    const last = opsAlertLastSent.get(key) ?? 0;
    if (now - last < OPS_ALERT_COOLDOWN_MS) return false;
    opsAlertLastSent.set(key, now);
    return true;
  }

  private async countFleetSeats(): Promise<number> {
    const db = this.db();
    const [tenantMembers, workspaceMembers] = await Promise.all([
      db.tenantMember.findMany({
        where: { isActive: true },
        select: { userId: true }
      }),
      this.prisma.workspaceMember.findMany({
        where: { isActive: true },
        select: { userId: true }
      })
    ]);
    return new Set([
      ...tenantMembers.map((row: { userId: string }) => row.userId),
      ...workspaceMembers.map((row: { userId: string }) => row.userId)
    ]).size;
  }

  private async getQueueCounts(): Promise<PlatformOpsSummaryDto["queues"]> {
    const queues: [string, Queue][] = [
      [QUEUES.MAIL, this.mailQueue],
      [QUEUES.BULK_INVITE, this.bulkInviteQueue],
      [QUEUES.BULK_CATEGORY, this.bulkCategoryQueue],
      [QUEUES.EXPORT, this.exportQueue]
    ];
    const entries = await Promise.all(
      queues.map(async ([name, queue]) => {
        const counts = await queue.getJobCounts("waiting", "active", "failed", "delayed");
        return [
          name,
          {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0
          }
        ] as const;
      })
    );

    return Object.fromEntries(entries);
  }

  private async fetchStripeMrr(): Promise<PlatformOpsSummaryDto["mrr"]> {
    if (!this.stripe.isConfigured()) return null;

    try {
      const stripe = this.stripe.getClient();
      let amountCents = 0;

      for (const status of ["active", "trialing"] as const) {
        let startingAfter: string | undefined;
        for (;;) {
          const page = await stripe.subscriptions.list({
            status,
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {})
          });
          for (const subscription of page.data) {
            for (const item of subscription.items.data) {
              amountCents += (item.price.unit_amount ?? 0) * (item.quantity ?? 1);
            }
          }
          if (!page.has_more || page.data.length === 0) break;
          startingAfter = page.data[page.data.length - 1]?.id;
        }
      }

      return { currency: "usd", amountCents, source: "stripe" };
    } catch {
      return null;
    }
  }

  private async countSubscriptionDrift(): Promise<number> {
    if (!this.stripe.isConfigured()) return 0;

    try {
      const rows = await this.db().tenantSubscription.findMany({
        where: { stripeSubscriptionId: { not: null } },
        select: { stripeSubscriptionId: true, status: true }
      });

      const stripe = this.stripe.getClient();
      let drift = 0;

      for (const row of rows) {
        const stripeSubscriptionId = row.stripeSubscriptionId;
        if (!stripeSubscriptionId) continue;
        try {
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          const mapped = this.sync.mapStripeStatus(stripeSub.status);
          if (mapped !== row.status) drift += 1;
        } catch {
          drift += 1;
        }
      }

      return drift;
    } catch {
      return 0;
    }
  }
}
