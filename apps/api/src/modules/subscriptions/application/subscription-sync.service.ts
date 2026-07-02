import {
  PLAN_SLUGS,
  type PlanSlug,
  type SubscriptionStatus,
  type TenantSubscriptionDto
} from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import type Stripe from "stripe";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { SubscriptionLifecycleService } from "./subscription-lifecycle.service";
import { SubscriptionNotificationsService } from "./subscription-notifications.service";
import { toSubscriptionDto } from "./subscriptions.mapper";

@Injectable()
export class SubscriptionSyncService {
  constructor(
    private prisma: PrismaService,
    private notifications: SubscriptionNotificationsService,
    private lifecycle: SubscriptionLifecycleService
  ) {}

  private db() {
    return generatedPrisma(this.prisma);
  }

  mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    switch (stripeStatus) {
      case "trialing":
        return "trial";
      case "active":
        return "active";
      case "past_due":
      case "unpaid":
        return "past_due";
      case "canceled":
      case "incomplete_expired":
        return "canceled";
      case "paused":
        return "suspended";
      default:
        return "active";
    }
  }

  private async resolvePlanIdFromStripePrice(
    priceId: string | null | undefined
  ): Promise<string | null> {
    if (!priceId) return null;
    const plan = await this.db().plan.findFirst({
      where: { stripePriceId: priceId },
      select: { id: true }
    });
    return plan?.id ?? null;
  }

  async syncFromStripeSubscription(
    stripeSub: Stripe.Subscription,
    options?: { previousStatus?: string }
  ): Promise<TenantSubscriptionDto | null> {
    const tenantId =
      stripeSub.metadata?.tenantId ?? (await this.findTenantIdByStripeSubscription(stripeSub.id));
    if (!tenantId) return null;

    const priceId = stripeSub.items.data[0]?.price?.id;
    const planId = (await this.resolvePlanIdFromStripePrice(priceId)) ?? undefined;
    const status = this.mapStripeStatus(stripeSub.status);
    const currentPeriodEnd = stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000)
      : null;
    const trialEndsAt = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null;

    const price = stripeSub.items.data[0]?.price;
    const interval = price?.recurring?.interval; // "month" or "year"
    const billingInterval =
      interval === "month" ? "monthly" : interval === "year" ? "yearly" : null;
    const currentPeriodStart = stripeSub.current_period_start
      ? new Date(stripeSub.current_period_start * 1000)
      : null;

    const oldSub = await this.db().tenantSubscription.findUnique({
      where: { tenantId }
    });

    const updated = await this.db().tenantSubscription.update({
      where: { tenantId },
      data: {
        status,
        stripeCustomerId: String(stripeSub.customer),
        stripeSubscriptionId: stripeSub.id,
        currentPeriodStart,
        currentPeriodEnd,
        billingInterval,
        billingSource: "stripe",
        trialEndsAt: status === "trial" ? trialEndsAt : null,
        ...(planId ? { planId } : {})
      },
      include: { plan: true }
    });

    if (oldSub) {
      const planChanged = planId && planId !== oldSub.planId;
      const statusChanged = status !== oldSub.status;
      const periodRenewed =
        oldSub.currentPeriodEnd &&
        currentPeriodEnd &&
        currentPeriodEnd.getTime() > oldSub.currentPeriodEnd.getTime();

      if (planChanged) {
        await this.lifecycle.recordEvent(tenantId, {
          eventType: "plan_changed",
          fromPlanId: oldSub.planId,
          toPlanId: planId,
          fromStatus: oldSub.status,
          toStatus: status,
          actorType: "system",
          metadata: { stripeEventId: stripeSub.id, billingInterval }
        });
      }
      if (statusChanged && !planChanged) {
        await this.lifecycle.recordEvent(tenantId, {
          eventType: status === "canceled" ? "canceled" : "status_changed",
          fromStatus: oldSub.status,
          toStatus: status,
          actorType: "system",
          metadata: { stripeEventId: stripeSub.id }
        });
      }
      if (periodRenewed && !planChanged) {
        await this.lifecycle.recordEvent(tenantId, {
          eventType: "period_renewed",
          actorType: "system",
          metadata: { stripeEventId: stripeSub.id, currentPeriodStart, currentPeriodEnd }
        });
      }
    }

    if (options?.previousStatus !== "past_due" && status === "past_due") {
      await this.notifications.notifyPaymentFailed(tenantId);
    }

    return toSubscriptionDto(updated);
  }

  async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenantId;
    if (!tenantId) return;

    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    const stripeSubscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

    const planSlug = session.metadata?.planSlug as PlanSlug | undefined;
    let planId: string | undefined;
    if (planSlug) {
      const plan = await this.db().plan.findUnique({ where: { slug: planSlug } });
      planId = plan?.id;
    }

    const oldSub = await this.db().tenantSubscription.findUnique({
      where: { tenantId }
    });

    await this.db().tenantSubscription.update({
      where: { tenantId },
      data: {
        ...(planId ? { planId } : {}),
        ...(stripeCustomerId ? { stripeCustomerId } : {}),
        ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
        billingSource: "stripe",
        status: "active"
      }
    });

    if (oldSub) {
      if (planId && planId !== oldSub.planId) {
        await this.lifecycle.recordEvent(tenantId, {
          eventType: "plan_changed",
          fromPlanId: oldSub.planId,
          toPlanId: planId,
          fromStatus: oldSub.status,
          toStatus: "active",
          actorType: "tenant_owner",
          metadata: { stripeSessionId: session.id }
        });
      } else if (oldSub.status !== "active") {
        await this.lifecycle.recordEvent(tenantId, {
          eventType: "status_changed",
          fromStatus: oldSub.status,
          toStatus: "active",
          actorType: "tenant_owner",
          metadata: { stripeSessionId: session.id }
        });
      }
    }
  }

  async handleSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
    const tenantId =
      stripeSub.metadata?.tenantId ?? (await this.findTenantIdByStripeSubscription(stripeSub.id));
    if (!tenantId) return;

    const oldSub = await this.db().tenantSubscription.findUnique({
      where: { tenantId }
    });

    await this.db().tenantSubscription.update({
      where: { tenantId },
      data: { status: "canceled" }
    });

    if (oldSub && oldSub.status !== "canceled") {
      await this.lifecycle.recordEvent(tenantId, {
        eventType: "canceled",
        fromStatus: oldSub.status,
        toStatus: "canceled",
        actorType: "system",
        metadata: { stripeSubscriptionId: stripeSub.id }
      });
    }
  }

  async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId =
      typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
    if (!subscriptionId) return;

    const tenantId = await this.findTenantIdByStripeSubscription(subscriptionId);
    if (!tenantId) return;

    const oldSub = await this.db().tenantSubscription.findUnique({
      where: { tenantId },
      select: { status: true }
    });

    await this.db().tenantSubscription.update({
      where: { tenantId },
      data: { status: "past_due" }
    });

    if (oldSub && oldSub.status !== "past_due") {
      await this.lifecycle.recordEvent(tenantId, {
        eventType: "status_changed",
        fromStatus: oldSub.status,
        toStatus: "past_due",
        actorType: "system",
        metadata: { stripeInvoiceId: invoice.id }
      });
      await this.notifications.notifyPaymentFailed(tenantId);
    }
  }

  private async findTenantIdByStripeSubscription(
    stripeSubscriptionId: string
  ): Promise<string | null> {
    const row = await this.db().tenantSubscription.findFirst({
      where: { stripeSubscriptionId },
      select: { tenantId: true }
    });
    return row?.tenantId ?? null;
  }

  async findPlanSlugByPriceId(priceId: string): Promise<PlanSlug | null> {
    const plan = await this.db().plan.findFirst({
      where: { stripePriceId: priceId },
      select: { slug: true }
    });
    if (!plan) return null;
    if (
      plan.slug === PLAN_SLUGS.PILOT ||
      plan.slug === PLAN_SLUGS.STARTER ||
      plan.slug === PLAN_SLUGS.PRO
    ) {
      return plan.slug;
    }
    return null;
  }
}
