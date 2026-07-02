import { ErrorCodes, type CreateCheckoutSessionDto } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { resolvePublicAdminUrl } from "../admin-app-url.util";
import { StripeClient } from "../stripe/stripe.client";

@Injectable()
export class SubscriptionBillingService {
  constructor(
    private prisma: PrismaService,
    private stripeClient: StripeClient
  ) {}

  private defaultSuccessUrl(): string {
    return `${resolvePublicAdminUrl()}/account/billing?checkout=success`;
  }

  private defaultCancelUrl(): string {
    return `${resolvePublicAdminUrl()}/account/billing?checkout=cancel`;
  }

  private defaultPortalReturnUrl(): string {
    return `${resolvePublicAdminUrl()}/account/billing`;
  }

  async createCheckoutSession(
    tenantId: string,
    dto: CreateCheckoutSessionDto
  ): Promise<{ url: string }> {
    const plan = await this.prisma.plan.findUnique({ where: { slug: dto.planSlug } });
    if (!plan?.stripePriceId) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        `Plan is not available for checkout: ${dto.planSlug}`,
        HttpStatus.BAD_REQUEST
      );
    }

    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId }
    });
    if (!subscription) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Organization subscription not found",
        HttpStatus.NOT_FOUND
      );
    }

    const owner = await this.prisma.tenantMember.findFirst({
      where: { tenantId, role: "OWNER", isActive: true },
      include: { user: { select: { email: true } } }
    });
    const ownerEmail = owner?.user.email;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true }
    });
    const tenantSlug = tenant?.slug;

    const stripe = this.stripeClient.getClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: subscription.stripeCustomerId ?? undefined,
      customer_email: subscription.stripeCustomerId ? undefined : ownerEmail,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: dto.successUrl ?? this.defaultSuccessUrl(),
      cancel_url: dto.cancelUrl ?? this.defaultCancelUrl(),
      metadata: { tenantId, tenantSlug: tenantSlug ?? "", planSlug: dto.planSlug },
      subscription_data: {
        metadata: { tenantId, tenantSlug: tenantSlug ?? "", planSlug: dto.planSlug }
      }
    });

    if (!session.url) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Stripe checkout session did not return a URL",
        HttpStatus.BAD_GATEWAY
      );
    }

    return { url: session.url };
  }

  async createPortalSession(tenantId: string): Promise<{ url: string }> {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId }
    });
    if (!subscription?.stripeCustomerId) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "No Stripe customer linked to this organization",
        HttpStatus.BAD_REQUEST
      );
    }

    const stripe = this.stripeClient.getClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: this.defaultPortalReturnUrl()
    });

    return { url: session.url };
  }
}
