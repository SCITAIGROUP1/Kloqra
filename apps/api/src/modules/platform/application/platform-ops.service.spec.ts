import { describe, expect, it, vi, beforeEach } from "vitest";
import { QUEUES } from "../../../common/queues";
import { PlatformOpsService } from "./platform-ops.service";

describe("PlatformOpsService", () => {
  let service: PlatformOpsService;
  let mockPrisma: any;
  let mockStripe: { isConfigured: ReturnType<typeof vi.fn>; getClient: ReturnType<typeof vi.fn> };
  let mockSync: { mapStripeStatus: ReturnType<typeof vi.fn> };

  const queueCounts = {
    waiting: 1,
    active: 0,
    failed: 2,
    delayed: 0
  };

  function mockQueue() {
    return { getJobCounts: vi.fn().mockResolvedValue(queueCounts) };
  }

  beforeEach(() => {
    mockSync = {
      mapStripeStatus: vi.fn((status: string) => (status === "trialing" ? "trial" : status))
    };
    mockStripe = {
      isConfigured: vi.fn().mockReturnValue(false),
      getClient: vi.fn()
    };

    mockPrisma = {
      tenant: { groupBy: vi.fn() },
      tenantSubscription: {
        groupBy: vi.fn(),
        findMany: vi.fn().mockResolvedValue([])
      },
      workspace: { count: vi.fn().mockResolvedValue(3) },
      tenantMember: {
        findMany: vi.fn().mockResolvedValue([{ userId: "u1" }, { userId: "u2" }])
      },
      workspaceMember: {
        findMany: vi.fn().mockResolvedValue([{ userId: "u2" }, { userId: "u3" }])
      }
    };

    mockPrisma.tenant.groupBy.mockResolvedValue([
      { status: "active", _count: { _all: 2 } },
      { status: "pending_setup", _count: { _all: 1 } }
    ]);
    mockPrisma.tenantSubscription.groupBy.mockResolvedValue([
      { status: "active", _count: { _all: 2 } },
      { status: "trial", _count: { _all: 1 } }
    ]);

    service = new PlatformOpsService(
      mockPrisma,
      mockStripe as never,
      mockSync as never,
      { notifyAll: vi.fn().mockResolvedValue(undefined) } as never,
      mockQueue() as never,
      mockQueue() as never,
      mockQueue() as never,
      mockQueue() as never
    );
  });

  it("aggregates tenant, subscription, usage, and queue counts", async () => {
    const summary = await service.getOpsSummary();

    expect(summary.tenants.active).toBe(2);
    expect(summary.tenants.pendingSetup).toBe(1);
    expect(summary.tenants.trial).toBe(1);
    expect(summary.subscriptions.active).toBe(2);
    expect(summary.subscriptions.trial).toBe(1);
    expect(summary.usage.totalWorkspaces).toBe(3);
    expect(summary.usage.totalSeats).toBe(3);
    expect(summary.queues[QUEUES.MAIL]).toEqual(queueCounts);
    expect(summary.mrr).toBeNull();
    expect(summary.reconcile.driftCount).toBe(0);
    expect(summary.reconcile.lastCheckedAt).toBeTruthy();
  });

  it("computes stripe MRR when configured", async () => {
    mockStripe.isConfigured.mockReturnValue(true);
    mockStripe.getClient.mockReturnValue({
      subscriptions: {
        list: vi
          .fn()
          .mockResolvedValueOnce({
            data: [
              {
                items: {
                  data: [{ price: { unit_amount: 2900 }, quantity: 1 }]
                }
              }
            ],
            has_more: false
          })
          .mockResolvedValueOnce({ data: [], has_more: false })
      }
    });

    const summary = await service.getOpsSummary();
    expect(summary.mrr).toEqual({
      currency: "usd",
      amountCents: 2900,
      source: "stripe"
    });
  });
});
