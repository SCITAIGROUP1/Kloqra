import type { PlanCatalogItemDto } from "@kloqra/contracts";
import { planLimitsSchema } from "@kloqra/contracts";

export type PlanCatalogRow = {
  id: string;
  name: string;
  slug: string;
  limits: unknown;
  isPublic: boolean;
  sortOrder: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  tagline: string | null;
  monthlyPriceCents: number | null;
  yearlyPriceCents: number | null;
  features: unknown;
  recommended: boolean;
  billingMode: string;
  contactHref: string | null;
  visibleOnPricing: boolean;
};

export function toPlanCatalogItem(plan: PlanCatalogRow): PlanCatalogItemDto {
  const billingMode = plan.billingMode === "contact" ? "contact" : "stripe";
  const features = Array.isArray(plan.features)
    ? plan.features.filter((entry): entry is string => typeof entry === "string")
    : undefined;

  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    limits: planLimitsSchema.parse(plan.limits),
    isPublic: plan.isPublic,
    sortOrder: plan.sortOrder,
    stripeProductId: plan.stripeProductId,
    stripePriceId: plan.stripePriceId,
    tagline: plan.tagline,
    monthlyPriceCents: plan.monthlyPriceCents,
    yearlyPriceCents: plan.yearlyPriceCents,
    features,
    recommended: plan.recommended,
    billingMode,
    contactHref: plan.contactHref,
    visibleOnPricing: plan.visibleOnPricing
  };
}
