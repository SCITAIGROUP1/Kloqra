import { PLAN_IDS, PLAN_SLUGS } from "@kloqra/contracts";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PlatformPlansService } from "./platform-plans.service";

describe("PlatformPlansService", () => {
  let service: PlatformPlansService;
  let mockPrisma: {
    plan: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let mockAudit: { recordEvent: ReturnType<typeof vi.fn> };
  let mockCatalogSettings: { getSettings: ReturnType<typeof vi.fn> };

  const starterPlan = {
    id: PLAN_IDS[PLAN_SLUGS.STARTER],
    name: "Starter",
    slug: PLAN_SLUGS.STARTER,
    limits: { maxWorkspaces: 3, maxSeats: 10, maxReportingApiKeys: 5 },
    isPublic: true,
    sortOrder: 1,
    stripeProductId: "prod_starter",
    stripePriceId: "price_starter",
    tagline: "Small teams",
    monthlyPriceCents: 2900,
    yearlyPriceCents: 29000,
    features: ["Up to 10 seats"],
    recommended: false,
    billingMode: "stripe",
    contactHref: null,
    visibleOnPricing: true
  };

  beforeEach(() => {
    mockAudit = { recordEvent: vi.fn().mockResolvedValue(undefined) };
    mockCatalogSettings = {
      getSettings: vi.fn().mockResolvedValue({
        pricingBaselineFeatures: ["Time tracking and timesheets", "Exports and reporting"]
      })
    };
    mockPrisma = {
      plan: {
        findMany: vi.fn().mockResolvedValue([starterPlan]),
        findUnique: vi.fn().mockResolvedValue(starterPlan),
        update: vi.fn().mockResolvedValue({ ...starterPlan, name: "Starter Plus" })
      }
    };
    service = new PlatformPlansService(
      mockPrisma as never,
      mockAudit as never,
      mockCatalogSettings as never
    );
  });

  it("lists catalog plans with marketing fields and baseline features", async () => {
    const result = await service.listPlans();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.monthlyPriceCents).toBe(2900);
    expect(result.items[0]?.billingMode).toBe("stripe");
    expect(result.pricingBaselineFeatures).toEqual([
      "Time tracking and timesheets",
      "Exports and reporting"
    ]);
  });

  it("updates plan and records audit event", async () => {
    const result = await service.updatePlan(
      starterPlan.id,
      { name: "Starter Plus", monthlyPriceCents: 3900 },
      { actorPlatformUserId: "actor-1", ipAddress: "127.0.0.1" }
    );

    expect(result.name).toBe("Starter Plus");
    expect(mockAudit.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "platform.plan.updated" })
    );
  });
});
