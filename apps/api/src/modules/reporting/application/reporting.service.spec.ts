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
      project: { findMany: vi.fn().mockResolvedValue([{ id: "p1", color: "#236bfe" }]) },
      workspace: { findUnique: vi.fn().mockResolvedValue({ settings: { weekStart: "sunday" } }) }
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

    service = new ReportingService(
      mockPrisma as never,
      mockAggregation as never,
      {} as never,
      { assertCanAccessProject: vi.fn() } as never
    );
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

  it("respects weekStart setting when defined", async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue({ settings: { weekStart: "monday" } });

    await service.myWeekSummary(workspaceId, userId);

    expect(mockAggregation.fetchLogs).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({
        from: expect.any(Date),
        to: expect.any(Date)
      })
    );
  });
});

describe("ReportingService dashboard", () => {
  let service: ReportingService;
  let mockPrisma: {
    project: { findMany: ReturnType<typeof vi.fn> };
    task: { findMany: ReturnType<typeof vi.fn> };
    timeLog: { groupBy: ReturnType<typeof vi.fn> };
  };
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
    mockPrisma = {
      project: {
        findMany: vi.fn().mockResolvedValue([{ id: "p1", budgetHours: { toNumber: () => 40 } }])
      },
      task: {
        findMany: vi.fn().mockResolvedValue([{ id: "t1", projectId: "p1" }])
      },
      timeLog: {
        groupBy: vi.fn().mockResolvedValue([{ taskId: "t1", _sum: { durationSec: 72000 } }])
      },
      workspace: {
        findUnique: vi.fn().mockResolvedValue({ settings: { currency: "USD" } })
      }
    };
    mockAggregation = {
      fetchLogs: vi.fn().mockResolvedValue([
        {
          durationSec: 7200,
          isBillable: true,
          startTime: new Date("2025-06-01T12:00:00.000Z"),
          userId: "u1",
          task: { projectId: "p1", project: { name: "Website" } },
          user: { defaultHourlyRate: { toNumber: () => 100 } }
        }
      ]),
      resolveRateMaps: vi.fn().mockResolvedValue({ resolveRate: () => 100 }),
      buildAggregates: vi.fn().mockReturnValue({
        workspaceAgg: { totalHours: 2, billableHours: 2, billableAmount: 200 },
        byProject: new Map([
          ["p1", { projectName: "Website", totalHours: 2, billableHours: 2, billableAmount: 200 }]
        ]),
        byUser: new Map(),
        byCategory: new Map()
      })
    };
    mockReportCache = {
      dashboardKey: vi.fn().mockReturnValue("cache-key"),
      getDashboard: vi.fn().mockResolvedValue(null),
      setDashboard: vi.fn().mockResolvedValue(undefined)
    };
    service = new ReportingService(
      mockPrisma as never,
      mockAggregation as never,
      mockReportCache as never,
      { assertCanAccessProject: vi.fn() } as never
    );
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
      taskId,
      undefined
    );
    expect(mockAggregation.fetchLogs).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({ taskId })
    );
  });

  it("includes budget usage fields on timeByProject rows", async () => {
    const report = await service.dashboard(workspaceId, {
      from: "2025-06-01",
      to: "2025-06-07"
    });

    expect(report.timeByProject[0]).toMatchObject({
      projectId: "p1",
      budgetHours: 40,
      percentUsed: 50,
      budgetStatus: "on_track"
    });
  });
});

describe("ReportingService utilization", () => {
  let service: ReportingService;
  let mockPrisma: {
    workspace: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
    workspaceMember: { findMany: ReturnType<typeof vi.fn> };
    teamMember: { findMany: ReturnType<typeof vi.fn> };
  };
  let mockAggregation: { fetchLogs: ReturnType<typeof vi.fn> };

  const workspaceId = "ws-1";
  const projectId = "p1";

  beforeEach(() => {
    mockPrisma = {
      workspace: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          settings: { expectedWeeklyHours: 40 }
        })
      },
      workspaceMember: {
        findMany: vi.fn().mockResolvedValue([
          { userId: "u1", user: { id: "u1", name: "Alex" } },
          { userId: "u2", user: { id: "u2", name: "Sam" } }
        ])
      },
      teamMember: {
        findMany: vi.fn().mockResolvedValue([{ userId: "u1", user: { id: "u1", name: "Alex" } }])
      }
    };
    mockAggregation = {
      fetchLogs: vi.fn().mockResolvedValue([
        {
          userId: "u1",
          durationSec: 14_400,
          isBillable: true,
          user: { name: "Alex" }
        }
      ])
    };
    service = new ReportingService(
      mockPrisma as never,
      mockAggregation as never,
      {} as never,
      {} as never
    );
  });

  it("passes dashboard scope filters to fetchLogs", async () => {
    await service.utilization(workspaceId, {
      from: "2025-06-02T00:00:00.000Z",
      to: "2025-06-06T23:59:59.999Z",
      projectId,
      categoryId: "c1",
      taskId: "t1",
      page: 1,
      limit: 5
    });

    expect(mockAggregation.fetchLogs).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({
        projectIds: [projectId],
        categoryId: "c1",
        taskId: "t1"
      })
    );
  });

  it("uses weekday-based target hours for a Mon–Fri range", async () => {
    const result = await service.utilization(workspaceId, {
      from: "2025-06-02T00:00:00.000Z",
      to: "2025-06-06T23:59:59.999Z",
      page: 1,
      limit: 5
    });

    expect(result.targetHours).toBe(40);
    expect(result.members[0]).toMatchObject({
      userId: "u1",
      loggedHours: 4,
      utilizationPct: 10
    });
  });

  it("loads project team members when projectId is set", async () => {
    await service.utilization(workspaceId, {
      from: "2025-06-02T00:00:00.000Z",
      to: "2025-06-06T23:59:59.999Z",
      projectId,
      page: 1,
      limit: 5
    });

    expect(mockPrisma.teamMember.findMany).toHaveBeenCalled();
    expect(mockPrisma.workspaceMember.findMany).not.toHaveBeenCalled();
  });
});
