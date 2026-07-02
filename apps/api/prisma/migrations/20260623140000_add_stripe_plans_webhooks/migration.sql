-- Add Stripe product/price IDs to plans and webhook idempotency table (SaaS-F11).

ALTER TABLE "plans" ADD COLUMN "stripe_product_id" TEXT;
ALTER TABLE "plans" ADD COLUMN "stripe_price_id" TEXT;

CREATE UNIQUE INDEX "plans_stripe_product_id_key" ON "plans"("stripe_product_id");
CREATE UNIQUE INDEX "plans_stripe_price_id_key" ON "plans"("stripe_price_id");

CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);
