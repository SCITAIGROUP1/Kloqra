import { DEFAULT_PLAN_LIMITS, PLAN_SLUGS } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  isPaidCheckoutTier,
  PLAN_PRICING_TIERS,
  planSlugForTierName,
  resolveTierPriceDisplay
} from "./plan-pricing-catalog";

describe("plan-pricing-catalog", () => {
  it("orders tiers starter, pro, enterprise", () => {
    expect(PLAN_PRICING_TIERS.map((tier) => tier.name)).toEqual(["Starter", "Pro", "Enterprise"]);
  });

  it("includes baseline and limit lines in display features", () => {
    for (const tier of PLAN_PRICING_TIERS) {
      expect(tier.features.length).toBeGreaterThan(3);
      expect(tier.features.some((line) => line.includes("seats"))).toBe(true);
      expect(tier.features).toContain("Time tracking and timesheets");
    }
  });

  it("exposes starter and pro checkout tiers with limits aligned to catalog", () => {
    const starter = PLAN_PRICING_TIERS.find(
      (tier) => isPaidCheckoutTier(tier) && tier.slug === PLAN_SLUGS.STARTER
    );
    const pro = PLAN_PRICING_TIERS.find(
      (tier) => isPaidCheckoutTier(tier) && tier.slug === PLAN_SLUGS.PRO
    );

    expect(starter).toBeDefined();
    expect(pro).toBeDefined();
    expect(starter?.features).toContain(
      `Up to ${DEFAULT_PLAN_LIMITS[PLAN_SLUGS.STARTER].maxSeats} seats`
    );
    expect(pro?.features).toContain("Priority email support");
  });

  it("marks pro as the recommended tier", () => {
    const pro = PLAN_PRICING_TIERS.find(
      (tier) => isPaidCheckoutTier(tier) && tier.slug === PLAN_SLUGS.PRO
    );
    expect(pro?.recommended).toBe(true);
  });

  it("includes an enterprise contact tier backed by pilot limits", () => {
    const enterprise = PLAN_PRICING_TIERS.find((tier) => tier.kind === "contact");
    expect(enterprise?.name).toBe("Enterprise");
    expect(enterprise?.features).toContain(
      `Up to ${DEFAULT_PLAN_LIMITS[PLAN_SLUGS.PILOT].maxSeats} seats`
    );
    expect(enterprise?.features).toContain("Enterprise SLAs");
  });

  it("resolves tier names to plan slugs", () => {
    expect(planSlugForTierName(PLAN_PRICING_TIERS, "Starter")).toBe(PLAN_SLUGS.STARTER);
    expect(planSlugForTierName(PLAN_PRICING_TIERS, "Pro")).toBe(PLAN_SLUGS.PRO);
    expect(planSlugForTierName(PLAN_PRICING_TIERS, "Enterprise")).toBe(PLAN_SLUGS.PILOT);
  });

  it("resolves monthly and yearly display prices for checkout tiers", () => {
    const starter = PLAN_PRICING_TIERS.find(
      (tier) => isPaidCheckoutTier(tier) && tier.slug === PLAN_SLUGS.STARTER
    )!;

    expect(resolveTierPriceDisplay(starter, "monthly")).toEqual({
      price: "$29",
      suffix: "/mo"
    });
    expect(resolveTierPriceDisplay(starter, "yearly")).toEqual({
      price: "$290",
      suffix: "/yr"
    });
  });
});
