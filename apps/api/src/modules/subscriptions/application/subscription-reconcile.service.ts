import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { StripeClient } from "../stripe/stripe.client";
import { PAST_DUE_SUSPEND_DAYS } from "../subscription.constants";
import { SubscriptionSyncService } from "./subscription-sync.service";

@Injectable()
export class SubscriptionReconcileService {
  private readonly logger = new Logger(SubscriptionReconcileService.name);

  constructor(
    private prisma: PrismaService,
    private stripeClient: StripeClient,
    private sync: SubscriptionSyncService
  ) {}

  @Cron("0 5 * * *")
  async reconcileStripeSubscriptions(): Promise<void> {
    if (!this.stripeClient.isConfigured()) return;

    const rows = await this.prisma.tenantSubscription.findMany({
      where: { stripeSubscriptionId: { not: null } },
      select: { tenantId: true, stripeSubscriptionId: true, status: true }
    });

    const stripe = this.stripeClient.getClient();
    for (const row of rows) {
      if (!row.stripeSubscriptionId) continue;
      try {
        const stripeSub = await stripe.subscriptions.retrieve(row.stripeSubscriptionId);
        await this.sync.syncFromStripeSubscription(stripeSub, { previousStatus: row.status });
      } catch (err) {
        this.logger.warn(
          `Failed to reconcile subscription ${row.stripeSubscriptionId}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }

  @Cron("0 6 * * *")
  async suspendLongPastDueSubscriptions(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PAST_DUE_SUSPEND_DAYS);

    const result = await this.prisma.tenantSubscription.updateMany({
      where: {
        status: "past_due",
        updatedAt: { lte: cutoff }
      },
      data: { status: "suspended" }
    });

    if (result.count > 0) {
      this.logger.log(`Suspended ${result.count} past_due subscription(s)`);
    }
  }
}
