import { describe, expect, it } from "vitest";
import { DEFAULT_PLAN_LIMITS, PLAN_SLUGS } from "./plan-catalog";
import {
  buildPlanDisplayFeatures,
  DEFAULT_PRICING_BASELINE_FEATURES
} from "./plan-display-features";

describe("buildPlanDisplayFeatures", () => {
  it("includes limits header, tier extras, and baseline for starter", () => {
    const features = buildPlanDisplayFeatures({
      slug: PLAN_SLUGS.STARTER,
      billingMode: "stripe",
      limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.STARTER],
      features: []
    });

    expect(features[0]).toBe("Up to 10 seats");
    expect(features).toContain("Time tracking and timesheets");
    expect(features).toContain("Mobile-friendly access");
  });

  it("adds tier extras before baseline for pro", () => {
    const features = buildPlanDisplayFeatures({
      slug: PLAN_SLUGS.PRO,
      billingMode: "stripe",
      limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.PRO],
      features: ["Priority email support"]
    });

    expect(features).toContain("Priority email support");
    expect(features.indexOf("Priority email support")).toBeLessThan(
      features.indexOf("Time tracking and timesheets")
    );
  });

  it("uses enterprise-specific extras for contact tiers", () => {
    const features = buildPlanDisplayFeatures({
      slug: PLAN_SLUGS.PILOT,
      billingMode: "contact",
      limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.PILOT],
      features: ["Dedicated account manager", "Enterprise SLAs"]
    });

    expect(features).toContain("Up to 50 reporting API keys");
    expect(features).toContain("Dedicated account manager");
  });

  it("respects custom baseline from catalog settings", () => {
    const features = buildPlanDisplayFeatures(
      {
        slug: PLAN_SLUGS.STARTER,
        billingMode: "stripe",
        limits: DEFAULT_PLAN_LIMITS[PLAN_SLUGS.STARTER],
        features: []
      },
      ["Custom baseline only"]
    );

    expect(features).toContain("Custom baseline only");
    expect(features).not.toContain(DEFAULT_PRICING_BASELINE_FEATURES[0]);
  });
});
