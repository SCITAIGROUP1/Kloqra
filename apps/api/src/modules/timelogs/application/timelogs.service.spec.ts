import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { TimelogAuditService } from "./timelog-audit.service";
import { TimelogsService } from "./timelogs.service";

describe("TimelogsService listOccupancy", () => {
  let service: TimelogsService;
  let mockPrisma: {
    timeLog: { findMany: ReturnType<typeof vi.fn> };
    project: { findMany: ReturnType<typeof vi.fn> };
    timesheetPeriod: { findMany: ReturnType<typeof vi.fn> };
  };
  let mockTimesheetLock: { getPeriodStatus: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      timeLog: { findMany: vi.fn() },
      project: { findMany: vi.fn().mockResolvedValue([]) },
      timesheetPeriod: { findMany: vi.fn().mockResolvedValue([]) }
    };
    mockTimesheetLock = {
      getPeriodStatus: vi.fn().mockResolvedValue("DRAFT")
    };
    service = new TimelogsService(
      mockPrisma as never,
      {} as never,
      {} as never,
      mockTimesheetLock as never,
      {} as never
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
    mockPrisma.project.findMany.mockResolvedValue([
      {
        id: "proj-1",
        timesheetApprovalEnabled: true,
        timesheetApprovalPeriod: "weekly",
        workspace: { settings: {} }
      }
    ]);
    mockPrisma.timesheetPeriod.findMany.mockResolvedValue([
      {
        projectId: "proj-1",
        periodStart: new Date("2024-12-30T00:00:00.000Z"),
        status: "SUBMITTED"
      }
    ]);

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
    service = new TimelogsService(
      mockPrisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );
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
    expect(res.nextCursor).toBe("log-2:2026-06-02T09:00:00.000Z");
  });
});

describe("TimelogsService assertNoOverlap", () => {
  let service: TimelogsService;
  let mockPrisma: {
    timeLog: { findFirst: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockPrisma = {
      timeLog: { findFirst: vi.fn().mockResolvedValue(null) }
    };
    service = new TimelogsService(
      mockPrisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );
  });

  it("throws when an overlapping timelog exists", async () => {
    mockPrisma.timeLog.findFirst.mockResolvedValue({
      description: "Overlap",
      startTime: new Date("2025-01-02T09:30:00.000Z"),
      endTime: new Date("2025-01-02T10:30:00.000Z"),
      source: "manual",
      task: {
        taskName: "Design",
        project: { name: "Website" }
      }
    });

    await expect(
      service.assertNoOverlap(
        "user-1",
        new Date("2025-01-02T09:00:00.000Z"),
        new Date("2025-01-02T10:00:00.000Z")
      )
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof DomainException && err.getStatus() === 409
    );
  });

  it("passes when no overlap exists", async () => {
    await expect(
      service.assertNoOverlap(
        "user-1",
        new Date("2025-01-02T09:00:00.000Z"),
        new Date("2025-01-02T10:00:00.000Z")
      )
    ).resolves.toBeUndefined();
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

  it("snapshotFromLog captures exactly 7 required fields", () => {
    const log = {
      taskId: "t1",
      startTime: new Date("2025-01-01T09:00:00.000Z"),
      endTime: new Date("2025-01-01T10:00:00.000Z"),
      durationSec: 3600,
      description: "Work",
      isBillable: true,
      source: "timer_autostopped"
    };
    const snapshot = audit.snapshotFromLog(log);
    expect(Object.keys(snapshot)).toHaveLength(7);
    expect(snapshot.source).toBe("timer_autostopped");
  });
});

describe("TimelogsService resolveBillable", () => {
  let service: TimelogsService;

  beforeEach(() => {
    service = new TimelogsService({} as never, {} as never, {} as never, {} as never, {} as never);
  });

  it("MEMBER cannot override isBillable — task default is always used", () => {
    expect(service.resolveBillable("MEMBER", false, true)).toBe(false);
    expect(service.resolveBillable("MEMBER", true, false)).toBe(true);
    expect(service.resolveBillable("MEMBER", true, undefined)).toBe(true);
  });

  it("ADMIN can override isBillable", () => {
    expect(service.resolveBillable("ADMIN", false, true)).toBe(true);
    expect(service.resolveBillable("ADMIN", true, false)).toBe(false);
    expect(service.resolveBillable("ADMIN", true, undefined)).toBe(true);
  });
});

describe("TimelogsService createBatch", () => {
  let service: TimelogsService;
  let mockPrisma: any;
  let mockTimesheetLock: any;
  let mockAccess: any;
  let mockAudit: any;
  let mockReportCache: any;

  beforeEach(() => {
    mockPrisma = {
      task: { findUniqueOrThrow: vi.fn() },
      timeLog: { create: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn().mockImplementation(async (fn: any) => fn(mockPrisma))
    };
    mockTimesheetLock = {
      assertTaskPeriodEditable: vi.fn().mockResolvedValue(undefined)
    };
    mockAccess = {
      assertCanLogTask: vi.fn().mockResolvedValue(undefined)
    };
    mockAudit = {
      recordEvent: vi.fn().mockResolvedValue(undefined),
      snapshotFromLog: vi.fn().mockReturnValue({})
    };
    mockReportCache = {
      invalidateWorkspace: vi.fn().mockResolvedValue(undefined)
    };

    service = new TimelogsService(
      mockPrisma as any,
      mockReportCache as any,
      mockAudit as any,
      mockTimesheetLock as any,
      mockAccess as any
    );
  });

  it("throws validation error if endDate is in the future", async () => {
    const futureDate = new Date();
    futureDate.setUTCDate(futureDate.getUTCDate() + 1);
    const futureStr = futureDate.toISOString().slice(0, 10);

    await expect(
      service.createBatch("w1", "user-1", "MEMBER", {
        taskId: "task-1",
        localStartTime: "09:00",
        localEndTime: "10:00",
        startDate: "2026-06-01",
        endDate: futureStr,
        recurrence: "daily",
        timezone: "UTC",
        description: "Scrum"
      })
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof DomainException && err.getStatus() === 400
    );
  });

  it("throws validation error if startDate > endDate", async () => {
    await expect(
      service.createBatch("w1", "user-1", "MEMBER", {
        taskId: "task-1",
        localStartTime: "09:00",
        localEndTime: "10:00",
        startDate: "2026-06-19",
        endDate: "2026-06-18",
        recurrence: "daily",
        timezone: "UTC",
        description: "Scrum"
      })
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof DomainException && err.getStatus() === 400
    );
  });

  it("creates batch of weekdays and skips weekends", async () => {
    mockPrisma.task.findUniqueOrThrow.mockResolvedValue({ id: "task-1", billableDefault: true });
    mockPrisma.timeLog.create.mockResolvedValue({
      id: "new-log",
      userId: "user-1",
      taskId: "task-1",
      startTime: new Date(),
      endTime: new Date(),
      durationSec: 3600,
      description: "Scrum",
      isBillable: true,
      source: "manual"
    });

    const res = await service.createBatch("w1", "user-1", "MEMBER", {
      taskId: "task-1",
      localStartTime: "09:00",
      localEndTime: "10:00",
      startDate: "2026-06-15", // Monday
      endDate: "2026-06-19", // Friday
      recurrence: "weekdays",
      timezone: "UTC",
      description: "Scrum"
    });

    expect(res.createdCount).toBe(5);
    expect(res.skippedCount).toBe(0);
    expect(mockPrisma.timeLog.create).toHaveBeenCalledTimes(5);
    expect(mockReportCache.invalidateWorkspace).toHaveBeenCalledWith("w1");
  });

  it("skips overlapping days and reports them in summary", async () => {
    mockPrisma.task.findUniqueOrThrow.mockResolvedValue({ id: "task-1", billableDefault: true });
    mockPrisma.timeLog.create.mockResolvedValue({
      id: "new-log",
      userId: "user-1",
      taskId: "task-1",
      startTime: new Date(),
      endTime: new Date(),
      durationSec: 3600,
      description: "Scrum",
      isBillable: true,
      source: "manual"
    });

    // Mock overlap on the second day (June 16)
    mockPrisma.timeLog.findFirst.mockImplementation((args: any) => {
      const start = args.where.startTime.lt;
      if (start.toISOString().includes("2026-06-16")) {
        return Promise.resolve({
          description: "Existing Task",
          startTime: new Date(),
          endTime: new Date(),
          source: "manual"
        });
      }
      return Promise.resolve(null);
    });

    const res = await service.createBatch("w1", "user-1", "MEMBER", {
      taskId: "task-1",
      localStartTime: "09:00",
      localEndTime: "10:00",
      startDate: "2026-06-15",
      endDate: "2026-06-17",
      recurrence: "daily",
      timezone: "UTC"
    });

    expect(res.createdCount).toBe(2);
    expect(res.skippedCount).toBe(1);
    expect(res.skipped[0]?.date).toBe("2026-06-16");
    expect(res.skipped[0]?.reason).toContain("overlap");
  });

  it("skips locked days and reports them in summary", async () => {
    mockPrisma.task.findUniqueOrThrow.mockResolvedValue({ id: "task-1", billableDefault: true });
    mockPrisma.timeLog.create.mockResolvedValue({
      id: "new-log",
      userId: "user-1",
      taskId: "task-1",
      startTime: new Date(),
      endTime: new Date(),
      durationSec: 3600,
      description: "Scrum",
      isBillable: true,
      source: "manual"
    });

    // Mock lock period throw on the first day (June 15)
    mockTimesheetLock.assertTaskPeriodEditable.mockImplementation(
      (userId: string, taskId: string, start: Date) => {
        if (start.toISOString().includes("2026-06-15")) {
          throw new DomainException(
            ErrorCodes.TIMELOG_NOT_EDITABLE,
            "Locked",
            HttpStatus.FORBIDDEN
          );
        }
        return Promise.resolve(undefined);
      }
    );

    const res = await service.createBatch("w1", "user-1", "MEMBER", {
      taskId: "task-1",
      localStartTime: "09:00",
      localEndTime: "10:00",
      startDate: "2026-06-15",
      endDate: "2026-06-16",
      recurrence: "daily",
      timezone: "UTC"
    });

    expect(res.createdCount).toBe(1);
    expect(res.skippedCount).toBe(1);
    expect(res.skipped[0]?.date).toBe("2026-06-15");
    expect(res.skipped[0]?.reason).toContain("Locked");
  });
});
