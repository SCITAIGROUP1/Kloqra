import {
  formatPlanPriceUsd,
  PLAN_IDS,
  PLAN_SLUGS,
  type PaidPlanSlug,
  type PlanCatalogItemDto,
  type PlanPricingCatalogDto,
  type PlanPricingItemDto,
  type TenantSubscriptionDto
} from "@kloqra/contracts";

export type BillingInterval = "monthly" | "yearly";

export const BILLING_INTERVAL_OPTIONS: { value: BillingInterval; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" }
];

export type PlanPricingTier =
  | {
      kind: "checkout";
      slug: PaidPlanSlug;
      name: string;
      tagline: string;
      monthlyPriceDisplay: string;
      yearlyPriceDisplay: string;
      recommended?: boolean;
      features: string[];
      ctaLabel: string;
    }
  | {
      kind: "contact";
      slug: typeof PLAN_SLUGS.PILOT;
      name: string;
      tagline: string;
      monthlyPriceDisplay: null;
      recommended?: boolean;
      features: string[];
      ctaLabel: string;
      contactHref: string;
    };

const PRICING_TIER_ORDER: Record<string, number> = {
  [PLAN_SLUGS.STARTER]: 0,
  [PLAN_SLUGS.PRO]: 1,
  [PLAN_SLUGS.PILOT]: 2
};

function isPaidPlanSlug(slug: string): slug is PaidPlanSlug {
  return slug === PLAN_SLUGS.STARTER || slug === PLAN_SLUGS.PRO;
}

function sortPlansForPricing<T extends { slug: string; sortOrder: number; name: string }>(
  plans: T[]
): T[] {
  return [...plans].sort((a, b) => {
    const orderA = PRICING_TIER_ORDER[a.slug] ?? a.sortOrder;
    const orderB = PRICING_TIER_ORDER[b.slug] ?? b.sortOrder;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
}

function mapPlanToTier(plan: PlanCatalogItemDto & { displayFeatures?: string[] }): PlanPricingTier {
  const features = plan.displayFeatures ?? plan.features ?? [];
  const tagline = plan.tagline ?? "";

  if (plan.billingMode === "contact") {
    return {
      kind: "contact",
      slug: PLAN_SLUGS.PILOT,
      name: plan.name,
      tagline,
      monthlyPriceDisplay: null,
      recommended: plan.recommended,
      features,
      ctaLabel: "Contact sales",
      contactHref: plan.contactHref ?? "mailto:sales@kloqra.com"
    };
  }

  const slug = isPaidPlanSlug(plan.slug) ? plan.slug : PLAN_SLUGS.STARTER;

  return {
    kind: "checkout",
    slug,
    name: plan.name,
    tagline,
    monthlyPriceDisplay: formatPlanPriceUsd(plan.monthlyPriceCents) ?? "—",
    yearlyPriceDisplay: formatPlanPriceUsd(plan.yearlyPriceCents) ?? "—",
    recommended: plan.recommended,
    features,
    ctaLabel: `Upgrade to ${plan.name}`
  };
}

export function buildPricingTiersFromCatalog(catalog: PlanPricingCatalogDto): PlanPricingTier[] {
  return sortPlansForPricing(catalog.items).map((plan) => mapPlanToTier(plan));
}

/** @deprecated Prefer buildPricingTiersFromCatalog when baseline features are available. */
export function buildPricingTiersFromPlans(plans: PlanCatalogItemDto[]): PlanPricingTier[] {
  return sortPlansForPricing(plans).map((plan) => mapPlanToTier(plan));
}

export function buildPricingTiersFromPricingItems(items: PlanPricingItemDto[]): PlanPricingTier[] {
  return sortPlansForPricing(items).map((plan) => mapPlanToTier(plan));
}

export function isPaidCheckoutTier(
  tier: PlanPricingTier
): tier is Extract<PlanPricingTier, { kind: "checkout" }> {
  return tier.kind === "checkout";
}

export function resolveTierPriceDisplay(
  tier: PlanPricingTier,
  interval: BillingInterval
): { price: string | null; suffix: string } {
  if (!isPaidCheckoutTier(tier)) {
    return { price: null, suffix: "" };
  }

  if (interval === "yearly") {
    return { price: tier.yearlyPriceDisplay, suffix: "/yr" };
  }

  return { price: tier.monthlyPriceDisplay, suffix: "/mo" };
}

export function planSlugForTierName(
  tiers: PlanPricingTier[],
  name: string
): PaidPlanSlug | typeof PLAN_SLUGS.PILOT | null {
  const match = tiers.find((tier) => tier.name.toLowerCase() === name.toLowerCase());
  if (!match) return null;
  return match.kind === "checkout" ? match.slug : PLAN_SLUGS.PILOT;
}

/** Whether a pricing card represents the tenant's current subscription. */
export function isTierCurrent(
  tier: PlanPricingTier,
  subscription: Pick<TenantSubscriptionDto, "planId" | "planName">
): boolean {
  const subName = subscription.planName.toLowerCase();
  const tierName = tier.name.toLowerCase();

  if (subName === tierName) {
    return true;
  }

  if (isPaidCheckoutTier(tier)) {
    return subscription.planId === PLAN_IDS[tier.slug];
  }

  // Enterprise (pilot plan id): legacy rows may still use planName "pilot".
  if (
    subscription.planId === PLAN_IDS[PLAN_SLUGS.PILOT] &&
    subName === PLAN_SLUGS.PILOT &&
    tier.kind === "contact" &&
    (tierName === "enterprise" || tierName === PLAN_SLUGS.PILOT)
  ) {
    return true;
  }

  return false;
}
