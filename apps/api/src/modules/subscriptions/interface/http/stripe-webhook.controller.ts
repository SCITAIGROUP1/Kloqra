import { ROUTES } from "@kloqra/contracts";
import { Controller, Headers, Post, Req } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { StripeWebhookService } from "../../application/stripe-webhook.service";

@Controller()
@SkipThrottle()
export class StripeWebhookController {
  constructor(private webhook: StripeWebhookService) {}

  @Post(ROUTES.WEBHOOKS.STRIPE)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string | undefined
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      return { received: false };
    }
    const event = this.webhook.constructEvent(rawBody, signature);
    const result = await this.webhook.processEvent(event);
    return { received: true, ...result };
  }
}
