import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExportService } from "./export.service";

describe("ExportService loadContext", () => {
  let service: ExportService;
  let mockPrisma: { workspace: { findUniqueOrThrow: ReturnType<typeof vi.fn> } };
  let mockAggregation: {
    fetchLogs: ReturnType<typeof vi.fn>;
    resolveRateMaps: ReturnType<typeof vi.fn>;
    buildAggregates: ReturnType<typeof vi.fn>;
    teamMemberUserIds: ReturnType<typeof vi.fn>;
  };

  const workspaceId = "ws-1";
  const taskId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    mockPrisma = {
      workspace: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: workspaceId,
          name: "Acme",
          slug: "acme",
          settings: {}
        })
      }
    };
    mockAggregation = {
      fetchLogs: vi.fn().mockResolvedValue([]),
      resolveRateMaps: vi.fn().mockResolvedValue({ resolveRate: () => 0 }),
      buildAggregates: vi.fn().mockReturnValue({
        workspaceAgg: { totalHours: 0, billableHours: 0, billableAmount: 0 },
        byProject: new Map(),
        byUser: new Map(),
        byCategory: new Map()
      }),
      teamMemberUserIds: vi.fn()
    };
    service = new ExportService(mockPrisma as never, mockAggregation as never, {} as never);
  });

  it("passes taskId to fetchLogs", async () => {
    await service.loadContext(workspaceId, {
      from: "2025-06-01",
      to: "2025-06-07",
      taskId,
      billable: "all"
    });

    expect(mockAggregation.fetchLogs).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({ taskId })
    );
  });
});
