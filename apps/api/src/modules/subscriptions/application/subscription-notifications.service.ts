import { Injectable } from "@nestjs/common";
import { BillingMailer } from "../../../common/mailer/billing.mailer";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { resolvePublicAdminUrl } from "../admin-app-url.util";
import type { SubscriptionWithPlan } from "./subscriptions.mapper";

@Injectable()
export class SubscriptionNotificationsService {
  constructor(
    private prisma: PrismaService,
    private billingMailer: BillingMailer
  ) {}

  private billingUrl(): string {
    return `${resolvePublicAdminUrl()}/account/billing`;
  }

  private async loadOwner(tenantId: string) {
    return generatedPrisma(this.prisma).tenantMember.findFirst({
      where: { tenantId, role: "OWNER", isActive: true },
      include: { user: { select: { email: true, name: true } } }
    });
  }

  async notifyPaymentFailed(tenantId: string): Promise<void> {
    const owner = await this.loadOwner(tenantId);
    if (!owner?.user.email) return;

    await this.billingMailer.sendPaymentFailed({
      to: owner.user.email,
      name: owner.user.name,
      billingUrl: this.billingUrl()
    });
  }

  async notifyTrialEnding(tenantId: string, subscription: SubscriptionWithPlan): Promise<void> {
    const owner = await this.loadOwner(tenantId);
    if (!owner?.user.email) return;

    await this.billingMailer.sendTrialEnding({
      to: owner.user.email,
      name: owner.user.name,
      trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
      billingUrl: this.billingUrl()
    });
  }
}
