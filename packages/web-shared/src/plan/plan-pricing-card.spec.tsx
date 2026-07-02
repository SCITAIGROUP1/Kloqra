import {
  DEFAULT_PLAN_LIMITS,
  DEFAULT_PRICING_BASELINE_FEATURES,
  PLAN_IDS,
  PLAN_SLUGS,
  type PlanCatalogItemDto
} from "@kloqra/contracts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanPricingCard } from "./plan-pricing-card";
import { buildPricingTiersFromCatalog } from "./pricing-tier";

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
  }
];

const PRICING_TIERS = buildPricingTiersFromCatalog({
  baselineFeatures: [...DEFAULT_PRICING_BASELINE_FEATURES],
  items: FALLBACK_PLANS.map((plan) => ({
    ...plan,
    displayFeatures: [
      `Up to ${plan.limits.maxSeats} seats`,
      `Up to ${plan.limits.maxWorkspaces} workspaces`,
      ...(plan.features ?? []),
      ...DEFAULT_PRICING_BASELINE_FEATURES
    ]
  }))
});

describe("PlanPricingCard", () => {
  const starterTier = PRICING_TIERS.find(
    (tier) => tier.kind === "checkout" && tier.slug === PLAN_SLUGS.STARTER
  )!;
  const proTier = PRICING_TIERS.find(
    (tier) => tier.kind === "checkout" && tier.slug === PLAN_SLUGS.PRO
  )!;

  it("renders price, features, and recommended banner for pro", () => {
    const html = renderToStaticMarkup(
      <PlanPricingCard tier={proTier} testId="billing-upgrade-pro" />
    );

    expect(html).toContain("Pro");
    expect(html).toContain("$99");
    expect(html).toContain("Recommended");
    expect(html).toContain('data-testid="plan-pricing-recommended-banner"');
    expect(html).toContain("Time tracking and timesheets");
    expect(html).toContain('data-testid="billing-upgrade-pro"');
  });

  it("disables the CTA and shows an active badge when the tier is current", () => {
    const html = renderToStaticMarkup(
      <PlanPricingCard tier={starterTier} isCurrent testId="billing-upgrade-starter" />
    );

    expect(html).toContain("Active");
    expect(html).toContain('data-testid="billing-plan-card"');
    expect(html).toContain("Current plan");
    expect(html).toContain('disabled=""');
    expect(html).toContain('data-testid="billing-upgrade-starter"');
  });

  it("shows upgrade label for available checkout tiers", () => {
    const html = renderToStaticMarkup(
      <PlanPricingCard tier={starterTier} testId="billing-upgrade-starter" />
    );

    expect(html).toContain("Upgrade to Starter");
    expect(html).toContain("$29");
  });

  it("shows yearly pricing when the yearly interval is selected", () => {
    const html = renderToStaticMarkup(
      <PlanPricingCard tier={proTier} billingInterval="yearly" testId="billing-upgrade-pro" />
    );

    expect(html).toContain("$990");
    expect(html).toContain("/yr");
  });

  it("renders preview cards as non-interactive", () => {
    const html = renderToStaticMarkup(<PlanPricingCard tier={proTier} preview />);

    expect(html).toContain('data-testid="plan-pricing-preview-card"');
    expect(html).toContain('disabled=""');
    expect(html).toContain("Upgrade to Pro");
  });
});
