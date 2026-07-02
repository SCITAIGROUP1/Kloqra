import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { TimerService } from "./timer.service";

function createRedisMock() {
  const store = new Map<string, string>();
  const client = {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    mget: vi.fn((...keys: string[]) => Promise.resolve(keys.map((key) => store.get(key) ?? null))),
    set: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve("OK");
    }),
    del: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve(1);
    }),
    publish: vi.fn().mockResolvedValue(1)
  };
  return { store, client, redis: { getClient: () => client } };
}

describe("TimerService", () => {
  let service: TimerService;
  let redisMock: ReturnType<typeof createRedisMock>;
  let mockPrisma: any;
  let mockAccess: any;
  let mockAudit: any;
  let mockTimesheetLock: any;
  let mockTimelogs: any;
  let mockSubscriptions: any;

  const workspaceId = "ws-1";
  const userId = "user-1";
  const taskId = "task-1";

  beforeEach(() => {
    redisMock = createRedisMock();
    mockPrisma = {
      task: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: taskId, projectId: "proj-1", billableDefault: true }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: taskId,
          projectId: "proj-1",
          billableDefault: true
        })
      },
      workspaceMember: {
        findMany: vi.fn().mockResolvedValue([{ workspaceId }])
      },
      workspace: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ tenantId: "tenant-1" })
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          timeLog: {
            create: vi.fn().mockResolvedValue({
              id: "log-1",
              userId,
              taskId,
              startTime: new Date("2025-01-01T09:00:00.000Z"),
              endTime: new Date("2025-01-01T10:00:00.000Z"),
              durationSec: 3600,
              description: "Work",
              isBillable: true,
              source: "timer"
            })
          }
        };
        return fn(tx);
      })
    };
    mockAccess = {
      assertCanLogTask: vi.fn().mockResolvedValue(undefined)
    };
    mockAudit = {
      snapshotFromLog: vi.fn().mockReturnValue({ taskId }),
      recordEvent: vi.fn().mockResolvedValue(undefined)
    };
    mockTimesheetLock = {
      assertTaskPeriodEditable: vi.fn().mockResolvedValue(undefined)
    };
    mockTimelogs = {
      assertNoOverlap: vi.fn().mockResolvedValue(undefined)
    };
    mockSubscriptions = {
      assertSubscriptionAllowsWrites: vi.fn().mockResolvedValue(undefined)
    };

    service = new TimerService(
      mockPrisma,
      redisMock.redis as never,
      mockAccess,
      mockAudit,
      mockTimesheetLock,
      mockTimelogs,
      mockSubscriptions
    );
  });

  it("starts a timer when none is active", async () => {
    const result = await service.start(workspaceId, userId, "MEMBER", { taskId });

    expect(result.taskId).toBe(taskId);
    expect(result.elapsedSec).toBe(0);
    expect(redisMock.client.set).toHaveBeenCalled();
    expect(mockTimelogs.assertNoOverlap).toHaveBeenCalledWith(
      userId,
      expect.any(Date),
      expect.any(Date)
    );
  });

  it("throws TIMER_ALREADY_ACTIVE when a timer exists in the workspace", async () => {
    redisMock.store.set(
      `timer:${workspaceId}:${userId}`,
      JSON.stringify({ userId, workspaceId, taskId, startedAt: new Date().toISOString() })
    );

    await expect(service.start(workspaceId, userId, "MEMBER", { taskId })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.TIMER_ALREADY_ACTIVE &&
        err.getStatus() === HttpStatus.CONFLICT
    );
  });

  it("throws TIMER_ALREADY_ACTIVE when a timer exists in another workspace", async () => {
    mockPrisma.workspaceMember.findMany.mockResolvedValue([
      { workspaceId },
      { workspaceId: "ws-2" }
    ]);
    redisMock.store.set(
      `timer:ws-2:${userId}`,
      JSON.stringify({ userId, workspaceId: "ws-2", taskId, startedAt: new Date().toISOString() })
    );

    await expect(service.start(workspaceId, userId, "MEMBER", { taskId })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.TIMER_ALREADY_ACTIVE &&
        err.message.includes("another workspace") &&
        err.getStatus() === HttpStatus.CONFLICT
    );
  });

  it("throws TIMELOG_OVERLAP when an existing entry covers now", async () => {
    mockTimelogs.assertNoOverlap.mockRejectedValue(
      new DomainException(
        ErrorCodes.TIMELOG_OVERLAP,
        "You can't log time for two projects at once.",
        HttpStatus.CONFLICT
      )
    );

    await expect(service.start(workspaceId, userId, "MEMBER", { taskId })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.TIMELOG_OVERLAP &&
        err.getStatus() === HttpStatus.CONFLICT
    );
    expect(redisMock.client.set).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when task is missing", async () => {
    mockPrisma.task.findFirst.mockResolvedValue(null);

    await expect(service.start(workspaceId, userId, "MEMBER", { taskId })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.NOT_FOUND &&
        err.getStatus() === HttpStatus.NOT_FOUND
    );
  });

  it("stops an active timer and persists a timelog", async () => {
    const startedAt = new Date(Date.now() - 5000).toISOString();
    redisMock.store.set(
      `timer:${workspaceId}:${userId}`,
      JSON.stringify({
        userId,
        workspaceId,
        taskId,
        startedAt,
        accumulatedSec: 0,
        isPaused: false,
        pausedAt: null
      })
    );

    const result = await service.stop(workspaceId, userId, "MEMBER", { description: "Done" });

    expect(result.taskId).toBe(taskId);
    expect(result.source).toBe("timer");
    expect(redisMock.client.del).toHaveBeenCalledWith(`timer:${workspaceId}:${userId}`);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockTimelogs.assertNoOverlap).toHaveBeenCalledWith(
      userId,
      expect.any(Date),
      expect.any(Date)
    );
  });

  it("throws TIMER_NOT_ACTIVE when stopping with no timer", async () => {
    await expect(service.stop(workspaceId, userId, "MEMBER", {})).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof DomainException &&
        err.code === ErrorCodes.TIMER_NOT_ACTIVE &&
        err.getStatus() === HttpStatus.BAD_REQUEST
    );
  });

  it("returns null from active when no timer is stored", async () => {
    const result = await service.active(workspaceId, userId);
    expect(result).toBeNull();
  });

  it("returns elapsed seconds for a running timer", async () => {
    const startedAt = new Date(Date.now() - 5000).toISOString();
    redisMock.store.set(
      `timer:${workspaceId}:${userId}`,
      JSON.stringify({
        userId,
        workspaceId,
        taskId,
        startedAt,
        accumulatedSec: 10,
        isPaused: false,
        pausedAt: null
      })
    );

    const result = await service.active(workspaceId, userId);
    expect(result?.taskId).toBe(taskId);
    expect(result?.elapsedSec).toBeGreaterThanOrEqual(15);
  });

  it("pauses a running timer and accumulates elapsed time", async () => {
    const startedAt = new Date(Date.now() - 10_000).toISOString();
    redisMock.store.set(
      `timer:${workspaceId}:${userId}`,
      JSON.stringify({
        userId,
        workspaceId,
        taskId,
        startedAt,
        accumulatedSec: 0,
        isPaused: false,
        pausedAt: null
      })
    );

    const result = await service.pause(workspaceId, userId);
    expect(result.isPaused).toBe(true);
    expect(result.elapsedSec).toBeGreaterThan(0);
  });

  it("resumes a paused timer", async () => {
    redisMock.store.set(
      `timer:${workspaceId}:${userId}`,
      JSON.stringify({
        userId,
        workspaceId,
        taskId,
        startedAt: new Date().toISOString(),
        accumulatedSec: 120,
        isPaused: true,
        pausedAt: new Date().toISOString()
      })
    );

    const result = await service.resume(workspaceId, userId);
    expect(result.isPaused).toBe(false);
    expect(result.elapsedSec).toBe(120);
  });

  it("discards an active timer without creating a timelog", async () => {
    redisMock.store.set(
      `timer:${workspaceId}:${userId}`,
      JSON.stringify({
        userId,
        workspaceId,
        taskId,
        startedAt: new Date().toISOString(),
        accumulatedSec: 0,
        isPaused: false,
        pausedAt: null
      })
    );

    const result = await service.discard(workspaceId, userId);
    expect(result.discarded).toBe(true);
    expect(redisMock.client.del).toHaveBeenCalledWith(`timer:${workspaceId}:${userId}`);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("cleans up and returns null if stored timer state is malformed", async () => {
    redisMock.store.set(
      `timer:${workspaceId}:${userId}`,
      JSON.stringify({
        userId,
        workspaceId,
        taskId
        // missing startedAt, accumulatedSec, isPaused
      })
    );

    const result = await service.active(workspaceId, userId);
    expect(result).toBeNull();
    expect(redisMock.store.get(`timer:${workspaceId}:${userId}`)).toBeUndefined();
  });
});
