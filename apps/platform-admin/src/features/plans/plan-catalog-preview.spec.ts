import {
  DEFAULT_PLAN_LIMITS,
  DEFAULT_PRICING_BASELINE_FEATURES,
  PLAN_IDS,
  PLAN_SLUGS,
  type PlanCatalogItemDto
} from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { buildPlanPricingPreview, parseBaselineFeatures } from "./plan-catalog-preview";

const starterPlan: PlanCatalogItemDto = {
  id: PLAN_IDS[PLAN_SLUGS.STARTER],
  name: "Starter",
  slug: PLAN_SLUGS.STARTER,
  limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.STARTER],
  isPublic: true,
  sortOrder: 1,
  tagline: "For small teams",
  monthlyPriceCents: 2900,
  yearlyPriceCents: 29000,
  features: [],
  recommended: false,
  billingMode: "stripe",
  visibleOnPricing: true
};

describe("plan-catalog-preview", () => {
  it("parses baseline features from textarea lines", () => {
    expect(
      parseBaselineFeatures("Exports\n\nReporting", DEFAULT_PRICING_BASELINE_FEATURES)
    ).toEqual(["Exports", "Reporting"]);
  });

  it("builds preview tiers only for visible plans", () => {
    const tiers = buildPlanPricingPreview(
      [
        starterPlan,
        { ...starterPlan, id: "hidden", slug: "hidden", name: "Hidden", visibleOnPricing: false }
      ],
      DEFAULT_PRICING_BASELINE_FEATURES
    );

    expect(tiers).toHaveLength(1);
    expect(tiers[0]?.name).toBe("Starter");
    expect(tiers[0]?.features).toContain("Up to 10 seats");
  });
});
