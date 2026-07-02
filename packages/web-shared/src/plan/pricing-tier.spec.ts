import {
  buildPlanDisplayFeatures,
  DEFAULT_PLAN_LIMITS,
  DEFAULT_PRICING_BASELINE_FEATURES,
  PLAN_IDS,
  PLAN_SLUGS,
  type PlanCatalogItemDto
} from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  buildPricingTiersFromCatalog,
  isTierCurrent,
  resolveTierPriceDisplay
} from "./pricing-tier";

const starterPlan: PlanCatalogItemDto = {
  id: PLAN_IDS[PLAN_SLUGS.STARTER],
  name: "Starter",
  slug: PLAN_SLUGS.STARTER,
  limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.STARTER],
  isPublic: true,
  sortOrder: 1,
  tagline: "Small teams",
  monthlyPriceCents: 2900,
  yearlyPriceCents: 29000,
  features: [],
  recommended: false,
  billingMode: "stripe",
  visibleOnPricing: true
};

describe("buildPricingTiersFromCatalog", () => {
  it("maps pricing catalog items using server displayFeatures", () => {
    const baseline = [...DEFAULT_PRICING_BASELINE_FEATURES];
    const tiers = buildPricingTiersFromCatalog({
      baselineFeatures: baseline,
      items: [
        {
          ...starterPlan,
          displayFeatures: buildPlanDisplayFeatures(starterPlan, baseline)
        }
      ]
    });

    expect(tiers[0]?.kind).toBe("checkout");
    expect(resolveTierPriceDisplay(tiers[0]!, "monthly")).toEqual({
      price: "$29",
      suffix: "/mo"
    });
    expect(tiers[0]?.features).toContain("Time tracking and timesheets");
    expect(tiers[0]?.features).toContain("Up to 10 seats");
  });

  it("orders tiers starter, pro, then enterprise", () => {
    const baseline = [...DEFAULT_PRICING_BASELINE_FEATURES];
    const enterprisePlan: PlanCatalogItemDto = {
      id: PLAN_IDS[PLAN_SLUGS.PILOT],
      name: "Enterprise",
      slug: PLAN_SLUGS.PILOT,
      limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.PILOT],
      isPublic: false,
      sortOrder: 3,
      tagline: "Custom",
      monthlyPriceCents: null,
      yearlyPriceCents: null,
      features: ["Dedicated account manager"],
      recommended: false,
      billingMode: "contact",
      contactHref: "mailto:sales@kloqra.com",
      visibleOnPricing: true
    };
    const proPlan: PlanCatalogItemDto = {
      ...starterPlan,
      id: PLAN_IDS[PLAN_SLUGS.PRO],
      name: "Pro",
      slug: PLAN_SLUGS.PRO,
      limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.PRO],
      sortOrder: 2,
      monthlyPriceCents: 9900,
      yearlyPriceCents: 99000,
      features: ["Priority email support"],
      recommended: true
    };

    const tiers = buildPricingTiersFromCatalog({
      baselineFeatures: baseline,
      items: [enterprisePlan, proPlan, starterPlan].map((plan) => ({
        ...plan,
        displayFeatures: buildPlanDisplayFeatures(plan, baseline)
      }))
    });

    expect(tiers.map((tier) => tier.name)).toEqual(["Starter", "Pro", "Enterprise"]);
  });
});

describe("isTierCurrent", () => {
  const baseline = [...DEFAULT_PRICING_BASELINE_FEATURES];
  const enterprisePlan: PlanCatalogItemDto = {
    id: PLAN_IDS[PLAN_SLUGS.PILOT],
    name: "Enterprise",
    slug: PLAN_SLUGS.PILOT,
    limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.PILOT],
    isPublic: false,
    sortOrder: 3,
    tagline: "Custom",
    monthlyPriceCents: null,
    yearlyPriceCents: null,
    features: ["Dedicated account manager"],
    recommended: false,
    billingMode: "contact",
    contactHref: "mailto:sales@kloqra.com",
    visibleOnPricing: true
  };
  const starterContactPlan: PlanCatalogItemDto = {
    ...starterPlan,
    monthlyPriceCents: null,
    yearlyPriceCents: null,
    billingMode: "contact",
    contactHref: "mailto:sales@kloqra.com"
  };

  function tiersFrom(...plans: PlanCatalogItemDto[]) {
    return buildPricingTiersFromCatalog({
      baselineFeatures: baseline,
      items: plans.map((plan) => ({
        ...plan,
        displayFeatures: buildPlanDisplayFeatures(plan, baseline)
      }))
    });
  }

  it("marks only enterprise current when subscription is on pilot plan", () => {
    const tiers = tiersFrom(starterContactPlan, enterprisePlan);
    const subscription = {
      planId: PLAN_IDS[PLAN_SLUGS.PILOT],
      planName: "Enterprise"
    };

    const current = tiers.filter((tier) => isTierCurrent(tier, subscription));
    expect(current.map((tier) => tier.name)).toEqual(["Enterprise"]);
  });

  it("supports legacy pilot planName for enterprise contact tier", () => {
    const tiers = tiersFrom(enterprisePlan);
    const subscription = {
      planId: PLAN_IDS[PLAN_SLUGS.PILOT],
      planName: "Pilot"
    };

    expect(isTierCurrent(tiers[0]!, subscription)).toBe(true);
  });

  it("matches checkout tiers by plan id when names differ", () => {
    const tiers = tiersFrom(starterPlan);
    const subscription = {
      planId: PLAN_IDS[PLAN_SLUGS.STARTER],
      planName: "Starter"
    };

    expect(isTierCurrent(tiers[0]!, subscription)).toBe(true);
  });
});
