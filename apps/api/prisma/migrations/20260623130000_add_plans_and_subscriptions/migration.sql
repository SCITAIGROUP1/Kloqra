-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "limits" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "limits_override" JSONB,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_tenant_id_key" ON "tenant_subscriptions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_stripe_customer_id_key" ON "tenant_subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_stripe_subscription_id_key" ON "tenant_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_plan_id_idx" ON "tenant_subscriptions"("plan_id");

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed catalog plans (stable IDs for F09)
INSERT INTO "plans" ("id", "name", "slug", "limits", "is_public", "sort_order", "created_at", "updated_at")
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'Pilot',
    'pilot',
    '{"maxWorkspaces": 25, "maxSeats": 100}'::jsonb,
    false,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'Starter',
    'starter',
    '{"maxWorkspaces": 3, "maxSeats": 10}'::jsonb,
    true,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'Pro',
    'pro',
    '{"maxWorkspaces": 10, "maxSeats": 50}'::jsonb,
    true,
    2,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- Backfill: every existing tenant gets pilot plan (active)
INSERT INTO "tenant_subscriptions" ("id", "tenant_id", "plan_id", "status", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  t.id,
  '00000000-0000-4000-8000-000000000001',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "tenants" t
WHERE NOT EXISTS (
  SELECT 1 FROM "tenant_subscriptions" ts WHERE ts.tenant_id = t.id
);
