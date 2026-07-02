-- AlterTable
ALTER TABLE "tenant_subscriptions" ADD COLUMN     "billing_interval" TEXT,
ADD COLUMN     "billing_source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "current_period_start" TIMESTAMP(3),
ADD COLUMN     "plan_assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "tenant_subscription_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "from_plan_id" TEXT,
    "to_plan_id" TEXT,
    "from_status" TEXT,
    "to_status" TEXT,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_subscription_events_tenant_id_occurred_at_idx" ON "tenant_subscription_events"("tenant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "tenant_subscription_events_event_type_occurred_at_idx" ON "tenant_subscription_events"("event_type", "occurred_at");

-- AddForeignKey
ALTER TABLE "tenant_subscription_events" ADD CONSTRAINT "tenant_subscription_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscription_events" ADD CONSTRAINT "tenant_subscription_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "tenant_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "platform_refresh_tokens_platform_user_id_family_revoked_at_expi" RENAME TO "platform_refresh_tokens_platform_user_id_family_revoked_at__idx";
