import { HARD_AUTO_STOP_HOURS } from "@kloqra/contracts";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StaleTimerService } from "./stale-timer.service";

function createRedisMock(keys: string[], values: Record<string, string>) {
  const client = {
    keys: vi.fn().mockResolvedValue(keys),
    get: vi.fn((key: string) => Promise.resolve(values[key] ?? null)),
    del: vi.fn().mockResolvedValue(1),
    setex: vi.fn().mockResolvedValue("OK"),
    publish: vi.fn().mockResolvedValue(1)
  };
  return { client, redis: { getClient: () => client } };
}

describe("StaleTimerService", () => {
  let service: StaleTimerService;
  let redisMock: ReturnType<typeof createRedisMock>;
  let mockPrisma: any;
  let mockAudit: any;

  const workspaceId = "ws-1";
  const userId = "user-1";
  const taskId = "task-1";
  const redisKey = `timer:${workspaceId}:${userId}`;

  beforeEach(() => {
    mockPrisma = {
      task: {
        findUnique: vi.fn().mockResolvedValue({ id: taskId, billableDefault: true })
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          timeLog: {
            create: vi.fn().mockResolvedValue({
              id: "log-1",
              userId,
              taskId,
              startTime: new Date(),
              endTime: new Date(),
              durationSec: HARD_AUTO_STOP_HOURS * 3600,
              description: null,
              isBillable: true,
              source: "timer_autostopped"
            })
          }
        };
        return fn(tx);
      })
    };
    mockAudit = {
      snapshotFromLog: vi.fn().mockReturnValue({ taskId }),
      recordEvent: vi.fn().mockResolvedValue(undefined)
    };
  });

  it("auto-stops timers exceeding HARD_AUTO_STOP_HOURS", async () => {
    const startedAt = new Date(
      Date.now() - (HARD_AUTO_STOP_HOURS * 3600 + 60) * 1000
    ).toISOString();
    const state = JSON.stringify({
      userId,
      workspaceId,
      taskId,
      startedAt,
      accumulatedSec: 0,
      isPaused: false,
      pausedAt: null
    });

    redisMock = createRedisMock([redisKey], { [redisKey]: state });
    service = new StaleTimerService(mockPrisma, redisMock.redis as never, mockAudit);

    await service.scanAndAutoStop();

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(redisMock.client.del).toHaveBeenCalledWith(redisKey);
    expect(redisMock.client.setex).toHaveBeenCalledWith(
      `timer_autostopped:${workspaceId}:${userId}`,
      7200,
      expect.any(String)
    );
  });

  it("skips timers below the hard ceiling", async () => {
    const startedAt = new Date(Date.now() - 3600 * 1000).toISOString();
    const state = JSON.stringify({
      userId,
      workspaceId,
      taskId,
      startedAt,
      accumulatedSec: 0,
      isPaused: false,
      pausedAt: null
    });

    redisMock = createRedisMock([redisKey], { [redisKey]: state });
    service = new StaleTimerService(mockPrisma, redisMock.redis as never, mockAudit);

    await service.scanAndAutoStop();

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(redisMock.client.del).not.toHaveBeenCalled();
  });
});
