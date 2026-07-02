import { ErrorCodes, PLAN_IDS, PLAN_SLUGS } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { SubscriptionsService } from "./subscriptions.service";

describe("SubscriptionsService", () => {
  let service: SubscriptionsService;
  let mockPrisma: any;
  let mockNotifications: { notifyTrialEnding: ReturnType<typeof vi.fn> };
  const tenantId = "t-1";

  const pilotPlan = {
    id: PLAN_IDS[PLAN_SLUGS.PILOT],
    name: "Pilot",
    slug: PLAN_SLUGS.PILOT,
    limits: { maxWorkspaces: 25, maxSeats: 100, maxReportingApiKeys: 50 }
  };

  const starterPlan = {
    id: PLAN_IDS[PLAN_SLUGS.STARTER],
    name: "Starter",
    slug: PLAN_SLUGS.STARTER,
    limits: { maxWorkspaces: 3, maxSeats: 10, maxReportingApiKeys: 5 }
  };

  const subscriptionRow = {
    id: "sub-1",
    tenantId,
    planId: pilotPlan.id,
    status: "active",
    trialEndsAt: null,
    currentPeriodEnd: null,
    limitsOverride: null,
    stripeCustomerId: null,
    plan: pilotPlan
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifications = { notifyTrialEnding: vi.fn() };
    mockPrisma = {
      tenant: {
        findUnique: vi.fn().mockResolvedValue({ status: "active" })
      },
      tenantSubscription: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      plan: {
        findUnique: vi.fn()
      },
      tenantMember: {
        findFirst: vi.fn()
      }
    };
    const mockLifecycle = { recordEvent: vi.fn().mockResolvedValue(undefined) };
    service = new SubscriptionsService(
      mockPrisma,
      mockNotifications as never,
      mockLifecycle as never
    );
  });

  it("maps subscription with plan limits", async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue(subscriptionRow);

    const result = await service.getSubscriptionForTenant(tenantId);

    expect(result.planName).toBe("Pilot");
    expect(result.status).toBe("active");
    expect(result.limits).toEqual({ maxWorkspaces: 25, maxSeats: 100, maxReportingApiKeys: 50 });
    expect(result.billingAlert).toBeNull();
  });

  it("merges limits override for enterprise-style caps", async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue({
      ...subscriptionRow,
      limitsOverride: { maxSeats: 200 }
    });

    const result = await service.getSubscriptionForTenant(tenantId);

    expect(result.limits).toEqual({ maxWorkspaces: 25, maxSeats: 200, maxReportingApiKeys: 50 });
  });

  it("throws when subscription is missing", async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue(null);

    await expect(service.getSubscriptionForTenant(tenantId)).rejects.toSatisfy(
      (err: unknown) => err instanceof DomainException && err.getStatus() === HttpStatus.NOT_FOUND
    );
  });

  it("ensureSubscriptionForTenant returns existing row", async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue(subscriptionRow);

    const result = await service.ensureSubscriptionForTenant(tenantId);

    expect(result.planName).toBe("Pilot");
    expect(mockPrisma.tenantSubscription.create).not.toHaveBeenCalled();
  });

  it("ensureSubscriptionForTenant creates pilot subscription when missing", async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.plan.findUnique.mockResolvedValue(pilotPlan);
    mockPrisma.tenantSubscription.create.mockResolvedValue(subscriptionRow);

    const result = await service.ensureSubscriptionForTenant(tenantId);

    expect(result.planName).toBe("Pilot");
    expect(mockPrisma.tenantSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId,
          planId: pilotPlan.id,
          status: "active"
        })
      })
    );
  });

  it("assertSubscriptionAllowsWrites blocks past_due", async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue({
      ...subscriptionRow,
      status: "past_due"
    });

    await expect(service.assertSubscriptionAllowsWrites(tenantId)).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.getStatus() === HttpStatus.PAYMENT_REQUIRED &&
        err.code === ErrorCodes.PAYMENT_REQUIRED
    );
  });

  it("assertSubscriptionAllowsWrites allows active", async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue(subscriptionRow);
    await expect(service.assertSubscriptionAllowsWrites(tenantId)).resolves.toBeUndefined();
  });

  it("changePlan updates planId, sets active, and clears trial", async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue({
      ...subscriptionRow,
      status: "trial",
      trialEndsAt: new Date("2026-07-01T00:00:00.000Z")
    });
    mockPrisma.plan.findUnique.mockResolvedValue(starterPlan);
    mockPrisma.tenantSubscription.update.mockResolvedValue({
      ...subscriptionRow,
      planId: starterPlan.id,
      status: "active",
      trialEndsAt: null,
      plan: starterPlan
    });

    const result = await service.changePlan(tenantId, PLAN_SLUGS.STARTER);

    expect(result.planName).toBe("Starter");
    expect(result.status).toBe("active");
    expect(result.trialEndsAt).toBeNull();
    expect(mockPrisma.tenantSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId },
        data: expect.objectContaining({
          planId: starterPlan.id,
          status: "active",
          trialEndsAt: null
        })
      })
    );
  });

  it("changePlan is a no-op when plan is unchanged", async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue({
      ...subscriptionRow,
      planId: starterPlan.id,
      plan: starterPlan
    });
    mockPrisma.plan.findUnique.mockResolvedValue(starterPlan);

    const result = await service.changePlan(tenantId, PLAN_SLUGS.STARTER);

    expect(result.planName).toBe("Starter");
    expect(mockPrisma.tenantSubscription.update).not.toHaveBeenCalled();
  });
});
