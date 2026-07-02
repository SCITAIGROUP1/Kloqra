import { describe, expect, it, vi, beforeEach } from "vitest";
import { SubscriptionLifecycleService } from "./subscription-lifecycle.service";

// Mock the generatedPrisma helper to return our mock db
vi.mock("../../../common/prisma/generated-prisma.util", () => {
  return {
    generatedPrisma: (prisma: any) => prisma
  };
});

describe("SubscriptionLifecycleService", () => {
  let service: SubscriptionLifecycleService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tenantSubscription: {
        findUnique: vi.fn(),
        update: vi.fn()
      },
      tenantSubscriptionEvent: {
        create: vi.fn()
      }
    };
    service = new SubscriptionLifecycleService(mockPrisma as any);
  });

  it("does nothing if subscription does not exist", async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue(null);

    await service.recordEvent("tenant-1", {
      eventType: "plan_changed",
      actorType: "system"
    });

    expect(mockPrisma.tenantSubscription.findUnique).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" }
    });
    expect(mockPrisma.tenantSubscriptionEvent.create).not.toHaveBeenCalled();
    expect(mockPrisma.tenantSubscription.update).not.toHaveBeenCalled();
  });

  it("records event and does not update planAssignedAt if plan is unchanged", async () => {
    const mockSub = {
      id: "sub-123",
      tenantId: "tenant-1",
      planId: "plan-gold",
      status: "active",
      planAssignedAt: new Date("2025-01-01")
    };
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue(mockSub);

    await service.recordEvent("tenant-1", {
      eventType: "period_renewed",
      actorType: "tenant_owner",
      actorId: "user-owner"
    });

    expect(mockPrisma.tenantSubscriptionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        subscriptionId: "sub-123",
        eventType: "period_renewed",
        fromPlanId: null,
        toPlanId: null,
        fromStatus: null,
        toStatus: null,
        actorType: "tenant_owner",
        actorId: "user-owner"
      })
    });
    expect(mockPrisma.tenantSubscription.update).not.toHaveBeenCalled();
  });

  it("records event and updates planAssignedAt if plan changes", async () => {
    const mockSub = {
      id: "sub-123",
      tenantId: "tenant-1",
      planId: "plan-bronze",
      status: "active",
      planAssignedAt: new Date("2025-01-01")
    };
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue(mockSub);

    const occurredAt = new Date("2026-06-24T12:00:00.000Z");

    await service.recordEvent("tenant-1", {
      eventType: "plan_changed",
      occurredAt,
      fromPlanId: "plan-bronze",
      toPlanId: "plan-gold",
      actorType: "platform_user",
      actorId: "user-admin",
      metadata: { reason: "Upsell" }
    });

    expect(mockPrisma.tenantSubscriptionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        subscriptionId: "sub-123",
        eventType: "plan_changed",
        fromPlanId: "plan-bronze",
        toPlanId: "plan-gold",
        actorType: "platform_user",
        actorId: "user-admin",
        metadata: { reason: "Upsell" }
      })
    });

    expect(mockPrisma.tenantSubscription.update).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" },
      data: {
        planAssignedAt: occurredAt
      }
    });
  });

  it("uses custom transaction client (tx) if provided", async () => {
    const mockTx = {
      tenantSubscription: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sub-123",
          tenantId: "tenant-1",
          planId: "plan-bronze",
          status: "active"
        }),
        update: vi.fn()
      },
      tenantSubscriptionEvent: {
        create: vi.fn()
      }
    };

    await service.recordEvent(
      "tenant-1",
      {
        eventType: "status_changed",
        fromStatus: "active",
        toStatus: "past_due",
        actorType: "system"
      },
      mockTx as any
    );

    expect(mockTx.tenantSubscription.findUnique).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" }
    });
    expect(mockTx.tenantSubscriptionEvent.create).toHaveBeenCalled();
    expect(mockPrisma.tenantSubscription.findUnique).not.toHaveBeenCalled();
  });
});
