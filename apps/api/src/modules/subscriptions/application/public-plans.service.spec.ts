import { PLAN_IDS, PLAN_SLUGS } from "@kloqra/contracts";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PublicPlansService } from "./public-plans.service";

describe("PublicPlansService", () => {
  let service: PublicPlansService;
  let mockPrisma: {
    plan: { findMany: ReturnType<typeof vi.fn> };
    platformCatalogSettings: { findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockPrisma = {
      plan: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: PLAN_IDS[PLAN_SLUGS.STARTER],
            name: "Starter",
            slug: PLAN_SLUGS.STARTER,
            limits: { maxWorkspaces: 3, maxSeats: 10, maxReportingApiKeys: 5 }
          }
        ])
      },
      platformCatalogSettings: {
        findUnique: vi.fn().mockResolvedValue({
          pricingBaselineFeatures: ["Time tracking and timesheets", "Exports and reporting"]
        })
      }
    };
    service = new PublicPlansService(mockPrisma as never);
  });

  it("returns only public plans", async () => {
    const result = await service.listPublicPlans();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.slug).toBe(PLAN_SLUGS.STARTER);
    expect(mockPrisma.plan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isPublic: true } })
    );
  });

  it("returns pricing catalog with baseline and display features", async () => {
    mockPrisma.plan.findMany.mockResolvedValue([
      {
        id: PLAN_IDS[PLAN_SLUGS.STARTER],
        name: "Starter",
        slug: PLAN_SLUGS.STARTER,
        limits: { maxWorkspaces: 3, maxSeats: 10, maxReportingApiKeys: 5 },
        isPublic: true,
        sortOrder: 1,
        stripeProductId: "prod_test",
        stripePriceId: "price_test",
        tagline: "Small teams",
        monthlyPriceCents: 2900,
        yearlyPriceCents: 29000,
        features: [],
        recommended: false,
        billingMode: "stripe",
        contactHref: null,
        visibleOnPricing: true
      }
    ]);

    const result = await service.listPricingPlans();
    expect(result.baselineFeatures).toEqual([
      "Time tracking and timesheets",
      "Exports and reporting"
    ]);
    expect(result.items[0]?.monthlyPriceCents).toBe(2900);
    expect(result.items[0]?.displayFeatures).toContain("Up to 10 seats");
    expect(result.items[0]?.displayFeatures).toContain("Time tracking and timesheets");
    expect(mockPrisma.plan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { visibleOnPricing: true } })
    );
  });
});
