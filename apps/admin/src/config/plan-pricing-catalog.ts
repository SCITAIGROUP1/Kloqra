import {
  buildPlanDisplayFeatures,
  DEFAULT_PLAN_LIMITS,
  DEFAULT_PRICING_BASELINE_FEATURES,
  PLAN_IDS,
  PLAN_SLUGS,
  type PlanCatalogItemDto
} from "@kloqra/contracts";
import { buildPricingTiersFromCatalog, type PlanPricingTier } from "@kloqra/web-shared";

export {
  BILLING_INTERVAL_OPTIONS,
  buildPricingTiersFromCatalog,
  buildPricingTiersFromPlans,
  isPaidCheckoutTier,
  planSlugForTierName,
  resolveTierPriceDisplay,
  type BillingInterval,
  type PlanPricingTier
} from "@kloqra/web-shared";

const FALLBACK_PLANS: PlanCatalogItemDto[] = [
  {
    id: PLAN_IDS[PLAN_SLUGS.STARTER],
    name: "Starter",
    slug: PLAN_SLUGS.STARTER,
    limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.STARTER],
    isPublic: true,
    sortOrder: 1,
    tagline: "Ideal for small teams getting started with time tracking.",
    monthlyPriceCents: 2900,
    yearlyPriceCents: 29000,
    features: [],
    recommended: false,
    billingMode: "stripe",
    visibleOnPricing: true
  },
  {
    id: PLAN_IDS[PLAN_SLUGS.PRO],
    name: "Pro",
    slug: PLAN_SLUGS.PRO,
    limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.PRO],
    isPublic: true,
    sortOrder: 2,
    tagline: "For growing organizations that need more capacity and control.",
    monthlyPriceCents: 9900,
    yearlyPriceCents: 99000,
    features: ["Priority email support"],
    recommended: true,
    billingMode: "stripe",
    visibleOnPricing: true
  },
  {
    id: PLAN_IDS[PLAN_SLUGS.PILOT],
    name: "Enterprise",
    slug: PLAN_SLUGS.PILOT,
    limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.PILOT],
    isPublic: false,
    sortOrder: 3,
    tagline: "Custom limits, onboarding, and support for larger organizations.",
    monthlyPriceCents: null,
    yearlyPriceCents: null,
    features: ["Dedicated account manager", "Custom integrations", "Enterprise SLAs"],
    recommended: false,
    billingMode: "contact",
    contactHref: "mailto:sales@kloqra.com",
    visibleOnPricing: true
  }
];

const FALLBACK_BASELINE = [...DEFAULT_PRICING_BASELINE_FEATURES];

/** Static fallback when pricing API is unavailable (tests, offline). */
export const PLAN_PRICING_TIERS: PlanPricingTier[] = buildPricingTiersFromCatalog({
  baselineFeatures: FALLBACK_BASELINE,
  items: FALLBACK_PLANS.map((plan) => ({
    ...plan,
    displayFeatures: buildPlanDisplayFeatures(plan, FALLBACK_BASELINE)
  }))
});
