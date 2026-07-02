import { describe, expect, it, vi, beforeEach } from "vitest";
import { TenantAnalyticsService } from "./tenant-analytics.service";

describe("TenantAnalyticsService", () => {
  let service: TenantAnalyticsService;
  let mockPrisma: { workspace: { findMany: ReturnType<typeof vi.fn> } };
  let mockAggregation: {
    fetchLogs: ReturnType<typeof vi.fn>;
    resolveRateMaps: ReturnType<typeof vi.fn>;
    buildAggregates: ReturnType<typeof vi.fn>;
  };
  let mockCache: {
    tenantRollupKey: ReturnType<typeof vi.fn>;
    getTenantRollup: ReturnType<typeof vi.fn>;
    setTenantRollup: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      workspace: {
        findMany: vi.fn().mockResolvedValue([
          { id: "ws-1", name: "Alpha", settings: {} },
          { id: "ws-2", name: "Beta", settings: {} }
        ])
      },
      tenantMember: {
        findUnique: vi.fn().mockResolvedValue({ role: "OWNER", isActive: true, tenantId: "t-1" })
      }
    };
    mockAggregation = {
      fetchLogs: vi.fn().mockResolvedValue([]),
      resolveRateMaps: vi.fn().mockResolvedValue({ resolveRate: () => 100 }),
      buildAggregates: vi.fn().mockReturnValue({
        workspaceAgg: { totalHours: 0, billableHours: 0, billableAmount: 0 },
        byUser: new Map()
      })
    };
    mockCache = {
      tenantRollupKey: vi.fn().mockReturnValue("cache-key"),
      getTenantRollup: vi.fn().mockResolvedValue(null),
      setTenantRollup: vi.fn().mockResolvedValue(undefined)
    };

    mockAggregation.buildAggregates
      .mockReturnValueOnce({
        workspaceAgg: { totalHours: 10, billableHours: 8, billableAmount: 800 },
        byUser: new Map([
          ["u-1", {}],
          ["u-2", {}]
        ])
      })
      .mockReturnValueOnce({
        workspaceAgg: { totalHours: 5, billableHours: 5, billableAmount: 500 },
        byUser: new Map([["u-2", {}]])
      });

    service = new TenantAnalyticsService(
      mockPrisma as never,
      mockAggregation as never,
      mockCache as never
    );
  });

  it("aggregates totals across workspaces", async () => {
    const result = await service.getSummary("owner-1", "t-1", {
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T23:59:59.999Z"
    });

    expect(result.totals.totalHours).toBe(15);
    expect(result.totals.billableHours).toBe(13);
    expect(result.totals.billableAmount).toBe(1300);
    expect(result.totals.activeMembers).toBe(2);
    expect(result.totals.activeWorkspaces).toBe(2);
    expect(result.byWorkspace).toHaveLength(2);
    expect(mockCache.setTenantRollup).toHaveBeenCalled();
  });

  it("returns cached summary when present", async () => {
    const cached = {
      period: {
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-01-31T23:59:59.999Z"
      },
      totals: {
        totalHours: 1,
        billableHours: 1,
        billableAmount: 100,
        billablePercent: 100,
        activeMembers: 1,
        activeWorkspaces: 1,
        currency: "USD"
      },
      byWorkspace: []
    };
    mockCache.getTenantRollup.mockResolvedValue(cached);

    const result = await service.getSummary("owner-1", "t-1", {
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T23:59:59.999Z"
    });

    expect(result).toEqual(cached);
    expect(mockAggregation.fetchLogs).not.toHaveBeenCalled();
  });
});
