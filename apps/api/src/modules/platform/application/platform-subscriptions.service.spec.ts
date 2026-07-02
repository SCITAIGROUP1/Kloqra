import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PlatformSubscriptionsService } from "./platform-subscriptions.service";

// Mock the generatedPrisma helper to return our mock db
vi.mock("../../../common/prisma/generated-prisma.util", () => {
  return {
    generatedPrisma: (prisma: any) => prisma
  };
});

describe("PlatformSubscriptionsService", () => {
  let service: PlatformSubscriptionsService;
  let mockPrisma: any;
  let mockStripe: any;
  let mockSync: any;

  beforeEach(() => {
    mockPrisma = {
      tenantSubscription: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            tenantId: "tenant-1",
            planId: "plan-gold",
            status: "active",
            billingInterval: "month",
            currentPeriodStart: new Date("2026-06-01"),
            currentPeriodEnd: new Date("2026-07-01"),
            trialEndsAt: null,
            planAssignedAt: new Date("2026-06-01"),
            billingSource: "stripe",
            stripeSubscriptionId: "sub_123",
            tenant: { name: "Acme Corp", slug: "acme", status: "active" },
            plan: { name: "Gold Plan", slug: "gold" }
          }
        ]),
        findUnique: vi.fn()
      },
      tenantSalesInquiry: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([])
      },
      tenantSubscriptionEvent: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([])
      },
      plan: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };

    mockStripe = {
      isConfigured: vi.fn().mockReturnValue(false),
      getClient: vi.fn()
    };

    mockSync = {
      mapStripeStatus: vi.fn().mockReturnValue("active")
    };

    service = new PlatformSubscriptionsService(
      mockPrisma as any,
      mockStripe as any,
      mockSync as any
    );
  });

  describe("listSubscriptions", () => {
    it("returns mapped list items and calculates daysOnPlan", async () => {
      const result = await service.listSubscriptions({
        page: 1,
        limit: 10
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].tenantName).toBe("Acme Corp");
      expect(result.items[0].daysOnPlan).toBeDefined();
      expect(result.items[0].workItem).toBeNull();
    });

    it("resolves workItem as drift if status mismatch occurs", async () => {
      // Configure Stripe mock to trigger a drift
      mockStripe.isConfigured.mockReturnValue(true);
      mockStripe.getClient.mockReturnValue({
        subscriptions: {
          retrieve: vi.fn().mockResolvedValue({ status: "past_due" })
        }
      });
      // Mock sync service to map Stripe "past_due" to "past_due"
      mockSync.mapStripeStatus.mockReturnValue("past_due");

      // Database returns "active"
      mockPrisma.tenantSubscription.findMany.mockResolvedValue([
        {
          tenantId: "tenant-1",
          planId: "plan-gold",
          status: "active", // mismatch with past_due
          billingInterval: "month",
          currentPeriodStart: new Date("2026-06-01"),
          currentPeriodEnd: new Date("2026-07-01"),
          trialEndsAt: null,
          planAssignedAt: new Date("2026-06-01"),
          billingSource: "stripe",
          stripeSubscriptionId: "sub_123",
          tenant: { name: "Acme Corp", slug: "acme", status: "active" },
          plan: { name: "Gold Plan", slug: "gold" }
        }
      ]);

      const result = await service.listSubscriptions({
        page: 1,
        limit: 10
      });

      expect(result.items[0].workItem).toBe("drift");
    });
  });

  describe("getSubscriptionDetail", () => {
    it("throws NotFoundException if subscription does not exist", async () => {
      mockPrisma.tenantSubscription.findUnique.mockResolvedValue(null);

      await expect(service.getSubscriptionDetail("non-existent")).rejects.toThrow(
        NotFoundException
      );
    });

    it("returns detailed subscription and maps plan names for events", async () => {
      const mockSub = {
        tenantId: "tenant-1",
        planId: "plan-gold",
        status: "active",
        billingInterval: "month",
        currentPeriodStart: new Date("2026-06-01"),
        currentPeriodEnd: new Date("2026-07-01"),
        trialEndsAt: null,
        planAssignedAt: new Date("2026-06-01"),
        billingSource: "stripe",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        limitsOverride: null,
        tenant: { name: "Acme Corp", slug: "acme", status: "active" },
        plan: { name: "Gold Plan", slug: "gold" },
        events: [
          {
            id: "event-1",
            tenantId: "tenant-1",
            subscriptionId: "sub-123",
            eventType: "plan_changed",
            occurredAt: new Date("2026-06-01"),
            fromPlanId: "plan-bronze",
            toPlanId: "plan-gold",
            fromStatus: "active",
            toStatus: "active",
            actorType: "platform_user",
            actorId: "admin-1",
            metadata: null,
            createdAt: new Date("2026-06-01")
          }
        ]
      };
      mockPrisma.tenantSubscription.findUnique.mockResolvedValue(mockSub);
      mockPrisma.plan.findMany.mockResolvedValue([
        { id: "plan-bronze", name: "Bronze Plan" },
        { id: "plan-gold", name: "Gold Plan" }
      ]);

      const result = await service.getSubscriptionDetail("tenant-1");

      expect(result.tenantName).toBe("Acme Corp");
      expect(result.events).toHaveLength(1);
      expect(result.events[0].fromPlanName).toBe("Bronze Plan");
      expect(result.events[0].toPlanName).toBe("Gold Plan");
    });
  });

  describe("getWorkQueue", () => {
    it("returns queue counts and items having active work items", async () => {
      mockPrisma.tenantSubscription.count.mockImplementation(async ({ where }: any) => {
        if (where?.status === "past_due") return 1;
        return 0;
      });

      mockPrisma.tenantSubscription.findMany.mockResolvedValue([
        {
          tenantId: "tenant-1",
          planId: "plan-gold",
          status: "past_due", // past_due is a work item
          billingInterval: "month",
          currentPeriodStart: new Date("2026-06-01"),
          currentPeriodEnd: new Date("2026-07-01"),
          trialEndsAt: null,
          planAssignedAt: new Date("2026-06-01"),
          billingSource: "stripe",
          stripeSubscriptionId: "sub_123",
          tenant: { name: "Acme Corp", slug: "acme", status: "active" },
          plan: { name: "Gold Plan", slug: "gold" }
        }
      ]);

      const result = await service.getWorkQueue();

      expect(result.counts.pastDue).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].workItem).toBe("past_due");
    });
  });

  describe("getSubscriptionEvents", () => {
    it("returns paginated events and maps plan names", async () => {
      mockPrisma.tenantSubscriptionEvent.count.mockResolvedValue(1);
      mockPrisma.tenantSubscriptionEvent.findMany.mockResolvedValue([
        {
          id: "event-1",
          tenantId: "tenant-1",
          subscriptionId: "sub-123",
          eventType: "plan_changed",
          occurredAt: new Date("2026-06-01"),
          fromPlanId: "plan-bronze",
          toPlanId: "plan-gold",
          fromStatus: "active",
          toStatus: "active",
          actorType: "platform_user",
          actorId: "admin-1",
          metadata: null,
          createdAt: new Date("2026-06-01")
        }
      ]);
      mockPrisma.plan.findMany.mockResolvedValue([
        { id: "plan-bronze", name: "Bronze Plan" },
        { id: "plan-gold", name: "Gold Plan" }
      ]);

      const result = await service.getSubscriptionEvents("tenant-1", { page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].fromPlanName).toBe("Bronze Plan");
    });
  });
});
