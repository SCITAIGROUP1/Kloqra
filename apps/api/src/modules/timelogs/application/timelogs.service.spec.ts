import { describe, it, expect, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { TimelogAuditService } from "./timelog-audit.service";
import { TimelogsService } from "./timelogs.service";

describe("TimelogsService listOccupancy", () => {
  let service: TimelogsService;
  let mockPrisma: {
    timeLog: { findMany: ReturnType<typeof vi.fn> };
  };
  let mockTimesheetLock: { getPeriodStatus: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      timeLog: { findMany: vi.fn() }
    };
    mockTimesheetLock = {
      getPeriodStatus: vi.fn().mockResolvedValue("DRAFT")
    };
    service = new TimelogsService(
      mockPrisma as never,
      {} as never,
      {} as never,
      mockTimesheetLock as never
    );
  });

  it("rejects admin role", async () => {
    await expect(
      service.listOccupancy("user-1", "ADMIN", {
        from: "2025-01-01T00:00:00.000Z",
        to: "2025-01-08T00:00:00.000Z"
      })
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof DomainException && err.getStatus() === 403
    );
  });

  it("maps logs to occupancy items with labels", async () => {
    mockPrisma.timeLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        startTime: new Date("2025-01-02T09:00:00.000Z"),
        endTime: new Date("2025-01-02T10:00:00.000Z"),
        source: "manual",
        task: {
          projectId: "proj-1",
          taskName: "Design",
          project: {
            name: "Website",
            workspace: { id: "ws-2", name: "Other Co" }
          }
        }
      }
    ]);
    mockTimesheetLock.getPeriodStatus.mockResolvedValue("SUBMITTED");

    const res = await service.listOccupancy("user-1", "MEMBER", {
      from: "2025-01-01T00:00:00.000Z",
      to: "2025-01-08T00:00:00.000Z"
    });

    expect(mockPrisma.timeLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          task: {
            project: {
              workspace: { members: { some: { userId: "user-1" } } }
            }
          }
        })
      })
    );
    expect(res.items).toHaveLength(1);
    expect(res.items[0]).toEqual({
      id: "log-1",
      startTime: "2025-01-02T09:00:00.000Z",
      endTime: "2025-01-02T10:00:00.000Z",
      workspaceId: "ws-2",
      workspaceName: "Other Co",
      label: "Website — Design",
      source: "manual",
      isLocked: true
    });
  });
});

describe("TimelogsService list", () => {
  let service: TimelogsService;
  let mockPrisma: {
    timeLog: { findMany: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockPrisma = {
      timeLog: { findMany: vi.fn().mockResolvedValue([]) }
    };
    service = new TimelogsService(mockPrisma as never, {} as never, {} as never, {} as never);
  });

  it("applies projectId and categoryId filters on task relation", async () => {
    await service.list("ws-1", "user-1", "MEMBER", {
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      categoryId: "550e8400-e29b-41d4-a716-446655440001",
      limit: 10
    });

    expect(mockPrisma.timeLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          task: {
            projectId: "550e8400-e29b-41d4-a716-446655440000",
            categoryId: "550e8400-e29b-41d4-a716-446655440001",
            project: { workspaceId: "ws-1" }
          }
        }),
        take: 11
      })
    );
  });

  it("applies search and billableOnly filters", async () => {
    await service.list("ws-1", "user-1", "MEMBER", {
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z",
      search: "audit",
      billableOnly: true,
      limit: 10
    });

    expect(mockPrisma.timeLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isBillable: true,
          AND: [
            {
              OR: [
                { description: { contains: "audit", mode: "insensitive" } },
                { task: { taskName: { contains: "audit", mode: "insensitive" } } },
                { task: { project: { name: { contains: "audit", mode: "insensitive" } } } },
                {
                  task: {
                    category: { name: { contains: "audit", mode: "insensitive" } }
                  }
                }
              ]
            }
          ]
        })
      })
    );
  });

  it("returns nextCursor when more results exist", async () => {
    mockPrisma.timeLog.findMany.mockResolvedValue([
      {
        id: "log-2",
        userId: "user-1",
        taskId: "task-1",
        startTime: new Date("2026-06-02T09:00:00.000Z"),
        endTime: new Date("2026-06-02T10:00:00.000Z"),
        durationSec: 3600,
        description: null,
        isBillable: true,
        source: "manual"
      },
      {
        id: "log-1",
        userId: "user-1",
        taskId: "task-1",
        startTime: new Date("2026-06-01T09:00:00.000Z"),
        endTime: new Date("2026-06-01T10:00:00.000Z"),
        durationSec: 3600,
        description: null,
        isBillable: true,
        source: "manual"
      }
    ]);

    const res = await service.list("ws-1", "user-1", "MEMBER", {
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z",
      limit: 1
    });

    expect(res.items).toHaveLength(1);
    expect(res.nextCursor).toBe("log-2");
  });
});

describe("TimelogAuditService", () => {
  const audit = new TimelogAuditService({} as never);

  it("snapshotFromLog serializes log fields for audit diffs", () => {
    const log = {
      taskId: "550e8400-e29b-41d4-a716-446655440000",
      startTime: new Date("2025-01-01T09:00:00.000Z"),
      endTime: new Date("2025-01-01T10:00:00.000Z"),
      durationSec: 3600,
      description: "Work",
      isBillable: true,
      source: "manual"
    };

    const snapshot = audit.snapshotFromLog(log);

    expect(snapshot).toEqual({
      taskId: log.taskId,
      startTime: "2025-01-01T09:00:00.000Z",
      endTime: "2025-01-01T10:00:00.000Z",
      durationSec: 3600,
      description: "Work",
      isBillable: true,
      source: "manual"
    });
  });
});
