import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { DomainException } from "../../../common/errors/domain.exception";

@Injectable()
export class StripeClient {
  private stripe: Stripe | null = null;

  isConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  }

  getClient(): Stripe {
    if (!this.stripe) {
      const key = process.env.STRIPE_SECRET_KEY?.trim();
      if (!key) {
        throw new DomainException(
          ErrorCodes.VALIDATION_ERROR,
          "Stripe is not configured",
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
      this.stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
    }
    return this.stripe;
  }

  getWebhookSecret(): string {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Stripe webhook secret is not configured",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
    return secret;
  }
}
