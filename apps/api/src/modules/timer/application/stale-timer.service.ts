import { HARD_AUTO_STOP_HOURS } from "@chronomint/contracts";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";
// eslint-disable-next-line no-restricted-imports
import { TimelogAuditService } from "../../timelogs/application/timelog-audit.service";

const TICK_MS = 60_000; // Check every 60 seconds

interface TimerState {
  userId: string;
  workspaceId: string;
  taskId: string;
  startedAt: string;
  accumulatedSec: number;
  isPaused: boolean;
  pausedAt: string | null;
}

@Injectable()
export class StaleTimerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StaleTimerService.name);
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private audit: TimelogAuditService
  ) {}

  onModuleInit() {
    this.ticker = setInterval(() => {
      void this.scanAndAutoStop().catch((err: unknown) => {
        this.logger.error(
          `Stale timer scan failed: ${err instanceof Error ? err.message : String(err)}`
        );
      });
    }, TICK_MS);
  }

  onModuleDestroy() {
    if (this.ticker) clearInterval(this.ticker);
  }

  async scanAndAutoStop() {
    const keys = await this.redis.getClient().keys("timer:*:*");
    const hardCeilingSec = HARD_AUTO_STOP_HOURS * 3600;

    for (const key of keys) {
      const raw = await this.redis.getClient().get(key);
      if (!raw) continue;

      let state: TimerState;
      try {
        state = JSON.parse(raw) as TimerState;
      } catch {
        continue;
      }

      if (!state.startedAt || !state.userId || !state.workspaceId || !state.taskId) continue;

      const accumulated = state.accumulatedSec ?? 0;
      let totalElapsedSec: number;

      if (state.isPaused) {
        totalElapsedSec = accumulated;
      } else {
        const startedMs = new Date(state.startedAt).getTime();
        const currentSec = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
        totalElapsedSec = accumulated + currentSec;
      }

      if (totalElapsedSec < hardCeilingSec) continue;

      await this.autoStop(state, key, hardCeilingSec);
    }
  }

  private async autoStop(state: TimerState, redisKey: string, capSec: number) {
    try {
      const task = await this.prisma.task.findUnique({ where: { id: state.taskId } });
      if (!task) {
        // Task deleted, clean up Redis
        await this.redis.getClient().del(redisKey);
        return;
      }

      const end = new Date();
      const start = new Date(end.getTime() - capSec * 1000);

      await this.prisma.$transaction(async (tx) => {
        const log = await tx.timeLog.create({
          data: {
            userId: state.userId,
            taskId: state.taskId,
            startTime: start,
            endTime: end,
            durationSec: capSec,
            description: null,
            isBillable: task.billableDefault,
            source: "timer_autostopped"
          }
        });
        await this.audit.recordEvent(tx, {
          workspaceId: state.workspaceId,
          timeLogId: log.id,
          entryUserId: state.userId,
          actorId: state.userId,
          action: "CREATE",
          before: null,
          after: this.audit.snapshotFromLog(log)
        });
      });

      // Save notification flag in Redis for the client (expires in 2h)
      await this.redis
        .getClient()
        .setex(
          `timer_autostopped:${state.workspaceId}:${state.userId}`,
          7200,
          JSON.stringify({ stoppedAt: end.toISOString(), durationSec: capSec })
        );

      await this.redis.getClient().del(redisKey);
      await this.redis
        .getClient()
        .publish(
          `presence:${state.workspaceId}`,
          JSON.stringify({ type: "stop", userId: state.userId })
        );

      this.logger.warn(
        `Auto-stopped stale timer for user ${state.userId} in workspace ${state.workspaceId} after ${capSec}s`
      );
    } catch (err) {
      this.logger.error(
        `Failed to auto-stop timer ${redisKey}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
