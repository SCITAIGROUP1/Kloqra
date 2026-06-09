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
