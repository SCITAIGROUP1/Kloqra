import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PlatformModule } from "../platform/platform.module";
import { PlanLimitService } from "./application/plan-limit.service";
import { PublicPlansService } from "./application/public-plans.service";
import { StripeWebhookService } from "./application/stripe-webhook.service";
import { SubscriptionBillingService } from "./application/subscription-billing.service";
import { SubscriptionLifecycleService } from "./application/subscription-lifecycle.service";
import { SubscriptionNotificationsService } from "./application/subscription-notifications.service";
import { SubscriptionReconcileService } from "./application/subscription-reconcile.service";
import { SubscriptionSalesInquiryService } from "./application/subscription-sales-inquiry.service";
import { SubscriptionSyncService } from "./application/subscription-sync.service";
import { SubscriptionTrialCronService } from "./application/subscription-trial-cron.service";
import { SubscriptionsService } from "./application/subscriptions.service";
import { PublicPlansController } from "./interface/http/public-plans.controller";
import { StripeWebhookController } from "./interface/http/stripe-webhook.controller";
import { SubscriptionBillingController } from "./interface/http/subscription-billing.controller";
import { SubscriptionSalesInquiryController } from "./interface/http/subscription-sales-inquiry.controller";
import { StripeClient } from "./stripe/stripe.client";

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => PlatformModule)],
  controllers: [
    StripeWebhookController,
    SubscriptionBillingController,
    SubscriptionSalesInquiryController,
    PublicPlansController
  ],
  providers: [
    StripeClient,
    SubscriptionsService,
    SubscriptionLifecycleService,
    PlanLimitService,
    SubscriptionSyncService,
    SubscriptionNotificationsService,
    SubscriptionSalesInquiryService,
    StripeWebhookService,
    SubscriptionBillingService,
    SubscriptionReconcileService,
    SubscriptionTrialCronService,
    PublicPlansService
  ],
  exports: [
    SubscriptionsService,
    SubscriptionLifecycleService,
    PlanLimitService,
    StripeClient,
    SubscriptionSyncService,
    SubscriptionSalesInquiryService
  ]
})
export class SubscriptionsModule {}
