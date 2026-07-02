-- Plan catalog marketing + pricing config (managed from platform-admin)
ALTER TABLE "plans" ADD COLUMN "tagline" TEXT;
ALTER TABLE "plans" ADD COLUMN "monthly_price_cents" INTEGER;
ALTER TABLE "plans" ADD COLUMN "yearly_price_cents" INTEGER;
ALTER TABLE "plans" ADD COLUMN "features" JSONB;
ALTER TABLE "plans" ADD COLUMN "recommended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN "billing_mode" TEXT NOT NULL DEFAULT 'stripe';
ALTER TABLE "plans" ADD COLUMN "contact_href" TEXT;
ALTER TABLE "plans" ADD COLUMN "visible_on_pricing" BOOLEAN NOT NULL DEFAULT false;

-- Seed display config for existing tiers (amounts in USD cents)
UPDATE "plans" SET
  "tagline" = 'Ideal for small teams getting started with time tracking.',
  "monthly_price_cents" = 2900,
  "yearly_price_cents" = 29000,
  "recommended" = false,
  "billing_mode" = 'stripe',
  "visible_on_pricing" = true,
  "features" = '["Up to 10 seats","Up to 3 workspaces","Up to 5 reporting API keys","Time tracking and timesheets","Approval workflows","Exports and reporting","Mobile-friendly access"]'::jsonb
WHERE "slug" = 'starter';

UPDATE "plans" SET
  "tagline" = 'For growing organizations that need more capacity and control.',
  "monthly_price_cents" = 9900,
  "yearly_price_cents" = 99000,
  "recommended" = true,
  "billing_mode" = 'stripe',
  "visible_on_pricing" = true,
  "features" = '["Up to 50 seats","Up to 10 workspaces","Up to 25 reporting API keys","Time tracking and timesheets","Approval workflows","Exports and reporting","Mobile-friendly access","Priority email support"]'::jsonb
WHERE "slug" = 'pro';

UPDATE "plans" SET
  "name" = 'Enterprise',
  "tagline" = 'Custom limits, onboarding, and support for larger organizations.',
  "billing_mode" = 'contact',
  "contact_href" = 'mailto:sales@kloqra.com',
  "visible_on_pricing" = true,
  "features" = '["Up to 100 seats","Up to 25 workspaces","Up to 50 reporting API keys","Time tracking and timesheets","Approval workflows","Exports and reporting","Mobile-friendly access","Dedicated account manager","Custom integrations and SLAs"]'::jsonb
WHERE "slug" = 'pilot';
