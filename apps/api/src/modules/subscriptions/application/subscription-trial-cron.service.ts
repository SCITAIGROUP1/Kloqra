import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TRIAL_ENDING_ALERT_DAYS } from "../subscription.constants";
import { SubscriptionsService } from "./subscriptions.service";

@Injectable()
export class SubscriptionTrialCronService {
  private readonly logger = new Logger(SubscriptionTrialCronService.name);

  constructor(
    private prisma: PrismaService,
    private subscriptions: SubscriptionsService
  ) {}

  @Cron("0 8 * * *")
  async sendTrialEndingEmails(): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + TRIAL_ENDING_ALERT_DAYS);

    const trials = await this.prisma.tenantSubscription.findMany({
      where: {
        status: "trial",
        trialEndsAt: { gte: now, lte: windowEnd }
      },
      select: { tenantId: true }
    });

    for (const trial of trials) {
      try {
        await this.subscriptions.notifyTrialEnding(trial.tenantId);
      } catch (err) {
        this.logger.warn(
          `Trial ending email failed for tenant ${trial.tenantId}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }
}
