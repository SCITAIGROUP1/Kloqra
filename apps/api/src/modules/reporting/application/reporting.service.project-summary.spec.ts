import { describe, expect, it, vi, beforeEach } from "vitest";
import { ReportingService } from "./reporting.service";

describe("ReportingService.projectSummary", () => {
  let service: ReportingService;
  let mockAccess: {
    assertCanAccessProject: ReturnType<typeof vi.fn>;
    manageableProjectIds: ReturnType<typeof vi.fn>;
  };
  let mockAggregation: { fetchLogs: ReturnType<typeof vi.fn> };
  let mockPrisma: { project: { findFirst: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    mockAccess = {
      assertCanAccessProject: vi.fn().mockResolvedValue(undefined),
      manageableProjectIds: vi.fn().mockResolvedValue([])
    };
    mockAggregation = { fetchLogs: vi.fn().mockResolvedValue([]) };
    mockPrisma = {
      project: {
        findFirst: vi.fn().mockResolvedValue({ id: "p1", name: "Website" })
      }
    };
    service = new ReportingService(
      mockPrisma as never,
      mockAggregation as never,
      {} as never,
      mockAccess as never
    );
  });

  it("scopes member summaries to the current user", async () => {
    const result = await service.projectSummary("ws-1", "p1", "u1", "MEMBER", {
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-30T23:59:59.999Z"
    });

    expect(mockAggregation.fetchLogs).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({ projectId: "p1", userId: "u1" })
    );
    expect(result.projectName).toBe("Website");
    expect(result.entryCount).toBe(0);
  });
});
