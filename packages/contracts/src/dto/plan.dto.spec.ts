import { describe, expect, it } from "vitest";
import { DEFAULT_PLAN_LIMITS, PLAN_IDS, PLAN_SLUGS } from "../plan-catalog";
import { formatPlanPriceUsd, planCatalogItemSchema, updatePlatformPlanSchema } from "./plan.dto";

describe("planCatalogItemSchema", () => {
  it("accepts a full catalog row", () => {
    const result = planCatalogItemSchema.safeParse({
      id: PLAN_IDS[PLAN_SLUGS.STARTER],
      name: "Starter",
      slug: PLAN_SLUGS.STARTER,
      limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.STARTER],
      isPublic: true,
      sortOrder: 1,
      stripeProductId: "prod_test",
      stripePriceId: "price_test",
      tagline: "For small teams",
      monthlyPriceCents: 2900,
      yearlyPriceCents: 29000,
      features: ["Up to 10 seats"],
      recommended: false,
      billingMode: "stripe",
      visibleOnPricing: true
    });
    expect(result.success).toBe(true);
  });
});

describe("updatePlatformPlanSchema", () => {
  it("requires at least one field", () => {
    expect(updatePlatformPlanSchema.safeParse({}).success).toBe(false);
    expect(updatePlatformPlanSchema.safeParse({ name: "Pro" }).success).toBe(true);
  });
});

describe("formatPlanPriceUsd", () => {
  it("formats whole-dollar amounts", () => {
    expect(formatPlanPriceUsd(2900)).toBe("$29");
    expect(formatPlanPriceUsd(null)).toBeNull();
  });
});
