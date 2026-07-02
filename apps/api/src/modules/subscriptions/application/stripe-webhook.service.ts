import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import type Stripe from "stripe";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { SubscriptionSyncService } from "../application/subscription-sync.service";
import { StripeClient } from "../stripe/stripe.client";

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private stripeClient: StripeClient,
    private prisma: PrismaService,
    private sync: SubscriptionSyncService
  ) {}

  constructEvent(payload: Buffer, signature: string | string[] | undefined): Stripe.Event {
    if (!signature || Array.isArray(signature)) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Missing Stripe signature",
        HttpStatus.BAD_REQUEST
      );
    }
    try {
      return this.stripeClient
        .getClient()
        .webhooks.constructEvent(payload, signature, this.stripeClient.getWebhookSecret());
    } catch {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid Stripe webhook signature",
        HttpStatus.BAD_REQUEST
      );
    }
  }

  async processEvent(event: Stripe.Event): Promise<{ processed: boolean }> {
    const existing = await this.prisma.stripeWebhookEvent.findUnique({
      where: { id: event.id }
    });
    if (existing) {
      return { processed: false };
    }

    await this.prisma.stripeWebhookEvent.create({
      data: { id: event.id, type: event.type }
    });

    switch (event.type) {
      case "checkout.session.completed":
        await this.sync.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const tenantId =
          stripeSub.metadata?.tenantId ??
          (await this.findTenantIdByStripeSubscription(stripeSub.id));
        let previousStatus: string | undefined;
        if (tenantId) {
          const row = await this.prisma.tenantSubscription.findUnique({
            where: { tenantId },
            select: { status: true }
          });
          previousStatus = row?.status;
        }
        await this.sync.syncFromStripeSubscription(stripeSub, { previousStatus });
        break;
      }
      case "customer.subscription.deleted":
        await this.sync.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await this.sync.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { processed: true };
  }

  private async findTenantIdByStripeSubscription(
    stripeSubscriptionId: string
  ): Promise<string | null> {
    const row = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId },
      select: { tenantId: true }
    });
    return row?.tenantId ?? null;
  }
}
