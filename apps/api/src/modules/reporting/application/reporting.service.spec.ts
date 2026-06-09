import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportingService } from "./reporting.service";

describe("ReportingService myWeekSummary", () => {
  let service: ReportingService;
  let mockPrisma: { project: { findMany: ReturnType<typeof vi.fn> } };
  let mockAggregation: {
    fetchLogs: ReturnType<typeof vi.fn>;
    resolveRateMaps: ReturnType<typeof vi.fn>;
    buildAggregates: ReturnType<typeof vi.fn>;
  };

  const workspaceId = "ws-1";
  const userId = "user-1";

  beforeEach(() => {
    mockPrisma = {
      project: { findMany: vi.fn().mockResolvedValue([{ id: "p1", color: "#6366f1" }]) }
    };
    mockAggregation = {
      fetchLogs: vi.fn().mockResolvedValue([
        {
          projectId: "p1",
          projectName: "Website",
          categoryId: "c1",
          categoryName: "Development",
          durationSec: 7200,
          isBillable: true,
          startTime: new Date(),
          userId,
          taskId: "t1",
          hourlyRate: 100
        }
      ]),
      resolveRateMaps: vi.fn().mockResolvedValue({
        resolveRate: () => 100
      }),
      buildAggregates: vi.fn().mockReturnValue({
        byProject: new Map([
          ["p1", { projectName: "Website", totalHours: 2, billableHours: 2, billableAmount: 200 }]
        ]),
        byCategory: new Map([
          [
            "c1",
            { categoryName: "Development", totalHours: 2, billableHours: 2, billableAmount: 200 }
          ]
        ])
      })
    };

    service = new ReportingService(mockPrisma as never, mockAggregation as never, {} as never);
  });

  it("aggregates week totals and byCategory from TimeAggregationService", async () => {
    const summary = await service.myWeekSummary(workspaceId, userId);

    expect(mockAggregation.fetchLogs).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({ userId })
    );
    expect(summary.weekTotalHours).toBe(2);
    expect(summary.weekBillableHours).toBe(2);
    expect(summary.byProject).toHaveLength(1);
    expect(summary.byProject[0]).toMatchObject({
      projectId: "p1",
      projectName: "Website",
      totalHours: 2
    });
    expect(summary.byCategory).toHaveLength(1);
    expect(summary.byCategory[0]).toMatchObject({
      categoryId: "c1",
      categoryName: "Development",
      totalHours: 2
    });
  });

  it("passes categoryId filter to fetchLogs", async () => {
    await service.myWeekSummary(workspaceId, userId, { categoryId: "c1" });

    expect(mockAggregation.fetchLogs).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({ categoryId: "c1" })
    );
  });
});

describe("ReportingService dashboard", () => {
  let service: ReportingService;
  let mockAggregation: {
    fetchLogs: ReturnType<typeof vi.fn>;
    resolveRateMaps: ReturnType<typeof vi.fn>;
    buildAggregates: ReturnType<typeof vi.fn>;
  };
  let mockReportCache: {
    dashboardKey: ReturnType<typeof vi.fn>;
    getDashboard: ReturnType<typeof vi.fn>;
    setDashboard: ReturnType<typeof vi.fn>;
  };

  const workspaceId = "ws-1";
  const taskId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    mockAggregation = {
      fetchLogs: vi.fn().mockResolvedValue([]),
      resolveRateMaps: vi.fn().mockResolvedValue({ resolveRate: () => 0 }),
      buildAggregates: vi.fn().mockReturnValue({
        workspaceAgg: { totalHours: 0, billableHours: 0, billableAmount: 0 },
        byProject: new Map(),
        byUser: new Map(),
        byCategory: new Map()
      })
    };
    mockReportCache = {
      dashboardKey: vi.fn().mockReturnValue("cache-key"),
      getDashboard: vi.fn().mockResolvedValue(null),
      setDashboard: vi.fn().mockResolvedValue(undefined)
    };
    service = new ReportingService({} as never, mockAggregation as never, mockReportCache as never);
  });

  it("passes taskId filter to fetchLogs and cache key", async () => {
    await service.dashboard(workspaceId, {
      from: "2025-06-01",
      to: "2025-06-07",
      taskId
    });

    expect(mockReportCache.dashboardKey).toHaveBeenCalledWith(
      workspaceId,
      "2025-06-01",
      "2025-06-07",
      undefined,
      undefined,
      undefined,
      taskId
    );
    expect(mockAggregation.fetchLogs).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({ taskId })
    );
  });
});
