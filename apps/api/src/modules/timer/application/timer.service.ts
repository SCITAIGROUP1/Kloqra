import type { StartTimerDto, StopTimerDto } from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { ProjectAccessService } from "../../../common/access/project-access.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";
// eslint-disable-next-line no-restricted-imports
import { TimelogAuditService } from "../../timelogs/application/timelog-audit.service";
// eslint-disable-next-line no-restricted-imports
import { TimesheetLockService } from "../../timelogs/application/timesheet-lock.service";

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
export class TimerService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private access: ProjectAccessService,
    private audit: TimelogAuditService,
    private timesheetLock: TimesheetLockService
  ) {}

  private key(workspaceId: string, userId: string) {
    return `timer:${workspaceId}:${userId}`;
  }

  async start(workspaceId: string, userId: string, role: "ADMIN" | "MEMBER", dto: StartTimerDto) {
    const task = await this.prisma.task.findFirst({
      where: { id: dto.taskId, project: { workspaceId } }
    });
    if (!task)
      throw new DomainException(ErrorCodes.NOT_FOUND, "Task not found", HttpStatus.NOT_FOUND);
    await this.access.assertCanAccessProject(workspaceId, userId, role, task.projectId);

    const existing = await this.redis.getClient().get(this.key(workspaceId, userId));
    if (existing) {
      throw new DomainException(
        ErrorCodes.TIMER_ALREADY_ACTIVE,
        "Timer already running for this workspace (stop it on this or another device first)",
        HttpStatus.CONFLICT
      );
    }

    const state: TimerState = {
      userId,
      workspaceId,
      taskId: dto.taskId,
      startedAt: new Date().toISOString(),
      accumulatedSec: 0,
      isPaused: false,
      pausedAt: null
    };
    await this.redis.getClient().set(this.key(workspaceId, userId), JSON.stringify(state));
    await this.redis
      .getClient()
      .publish(`presence:${workspaceId}`, JSON.stringify({ type: "start", ...state }));

    return {
      userId,
      workspaceId,
      taskId: dto.taskId,
      startedAt: state.startedAt,
      elapsedSec: 0,
      isPaused: false
    };
  }

  async active(workspaceId: string, userId: string) {
    // Check if worker auto-stopped a timer since last poll
    const autostopKey = `timer_autostopped:${workspaceId}:${userId}`;
    const autostopRaw = await this.redis.getClient().get(autostopKey);
    if (autostopRaw) {
      await this.redis.getClient().del(autostopKey);
      return { autostopped: true, ...JSON.parse(autostopRaw) };
    }

    const raw = await this.redis.getClient().get(this.key(workspaceId, userId));
    if (!raw) return null;
    const state = JSON.parse(raw) as Partial<TimerState>;
    if (!state.startedAt || !state.taskId || !state.userId || !state.workspaceId) {
      await this.redis.getClient().del(this.key(workspaceId, userId));
      return null;
    }
    const startedMs = new Date(state.startedAt).getTime();
    if (!Number.isFinite(startedMs)) {
      await this.redis.getClient().del(this.key(workspaceId, userId));
      return null;
    }

    const accumulated = state.accumulatedSec ?? 0;
    let elapsedSec: number;

    if (state.isPaused) {
      elapsedSec = accumulated;
    } else {
      elapsedSec = accumulated + Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
    }

    return {
      userId: state.userId,
      workspaceId: state.workspaceId,
      taskId: state.taskId,
      startedAt: state.startedAt,
      elapsedSec,
      isPaused: state.isPaused ?? false,
      pausedAt: state.pausedAt ?? null,
      accumulatedSec: accumulated
    };
  }

  async stop(workspaceId: string, userId: string, dto: StopTimerDto) {
    const raw = await this.redis.getClient().get(this.key(workspaceId, userId));
    if (!raw) {
      throw new DomainException(
        ErrorCodes.TIMER_NOT_ACTIVE,
        "No active timer",
        HttpStatus.BAD_REQUEST
      );
    }
    const state = JSON.parse(raw) as TimerState;
    const end = new Date();
    const task = await this.prisma.task.findUniqueOrThrow({ where: { id: state.taskId } });

    let totalSec: number;
    const accumulated = state.accumulatedSec ?? 0;
    if (state.isPaused) {
      totalSec = accumulated;
    } else {
      const startedMs = new Date(state.startedAt).getTime();
      totalSec = accumulated + Math.max(0, Math.floor((end.getTime() - startedMs) / 1000));
    }

    // Synthetic start time so duration matches and is contiguous
    const start = new Date(end.getTime() - totalSec * 1000);
    await this.timesheetLock.assertTaskPeriodEditable(userId, state.taskId, start);

    const log = await this.prisma.$transaction(async (tx) => {
      const created = await tx.timeLog.create({
        data: {
          userId,
          taskId: state.taskId,
          startTime: start,
          endTime: end,
          durationSec: totalSec,
          description: dto.description,
          isBillable: dto.isBillable ?? task.billableDefault,
          source: "timer"
        }
      });
      await this.audit.recordEvent(tx, {
        workspaceId,
        timeLogId: created.id,
        entryUserId: userId,
        actorId: userId,
        action: "CREATE",
        before: null,
        after: this.audit.snapshotFromLog(created)
      });
      return created;
    });

    await this.redis.getClient().del(this.key(workspaceId, userId));
    await this.redis
      .getClient()
      .publish(`presence:${workspaceId}`, JSON.stringify({ type: "stop", userId }));

    return {
      id: log.id,
      userId: log.userId,
      taskId: log.taskId,
      startTime: log.startTime.toISOString(),
      endTime: log.endTime.toISOString(),
      durationSec: log.durationSec,
      description: log.description,
      isBillable: log.isBillable,
      source: "timer" as const
    };
  }

  async pause(workspaceId: string, userId: string) {
    const raw = await this.redis.getClient().get(this.key(workspaceId, userId));
    if (!raw) {
      throw new DomainException(
        ErrorCodes.TIMER_NOT_ACTIVE,
        "No active timer",
        HttpStatus.BAD_REQUEST
      );
    }
    const state = JSON.parse(raw) as TimerState;
    if (state.isPaused) {
      throw new DomainException(
        ErrorCodes.TIMER_ALREADY_PAUSED,
        "Timer is already paused",
        HttpStatus.CONFLICT
      );
    }

    const now = new Date();
    const startedMs = new Date(state.startedAt).getTime();
    const segmentSec = Math.max(0, Math.floor((now.getTime() - startedMs) / 1000));
    const newAccumulated = (state.accumulatedSec ?? 0) + segmentSec;

    const updated: TimerState = {
      ...state,
      accumulatedSec: newAccumulated,
      isPaused: true,
      pausedAt: now.toISOString()
    };

    await this.redis.getClient().set(this.key(workspaceId, userId), JSON.stringify(updated));
    await this.redis
      .getClient()
      .publish(`presence:${workspaceId}`, JSON.stringify({ type: "pause", userId }));

    return { isPaused: true, elapsedSec: newAccumulated, pausedAt: updated.pausedAt };
  }

  async resume(workspaceId: string, userId: string) {
    const raw = await this.redis.getClient().get(this.key(workspaceId, userId));
    if (!raw) {
      throw new DomainException(
        ErrorCodes.TIMER_NOT_ACTIVE,
        "No active timer",
        HttpStatus.BAD_REQUEST
      );
    }
    const state = JSON.parse(raw) as TimerState;
    if (!state.isPaused) {
      throw new DomainException(
        ErrorCodes.TIMER_NOT_PAUSED,
        "Timer is not paused",
        HttpStatus.CONFLICT
      );
    }

    const now = new Date();
    const updated: TimerState = {
      ...state,
      startedAt: now.toISOString(),
      isPaused: false,
      pausedAt: null
    };

    await this.redis.getClient().set(this.key(workspaceId, userId), JSON.stringify(updated));
    await this.redis
      .getClient()
      .publish(`presence:${workspaceId}`, JSON.stringify({ type: "resume", userId }));

    return { isPaused: false, elapsedSec: updated.accumulatedSec, startedAt: updated.startedAt };
  }

  async discard(workspaceId: string, userId: string) {
    const raw = await this.redis.getClient().get(this.key(workspaceId, userId));
    if (!raw) {
      throw new DomainException(
        ErrorCodes.TIMER_NOT_ACTIVE,
        "No active timer",
        HttpStatus.BAD_REQUEST
      );
    }
    await this.redis.getClient().del(this.key(workspaceId, userId));
    await this.redis
      .getClient()
      .publish(`presence:${workspaceId}`, JSON.stringify({ type: "stop", userId }));
    return { discarded: true };
  }

  async activeCount(workspaceId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true }
    });

    const activeMembers = [];
    const taskIds = new Set<string>();
    const timerStates = [];

    for (const m of members) {
      const raw = await this.redis.getClient().get(`timer:${workspaceId}:${m.userId}`);
      if (!raw) continue;
      const state = JSON.parse(raw) as { taskId: string; startedAt: string };
      taskIds.add(state.taskId);
      timerStates.push({
        userId: m.userId,
        userName: m.user.name,
        taskId: state.taskId
      });
    }

    const tasks =
      taskIds.size > 0
        ? await this.prisma.task.findMany({
            where: { id: { in: [...taskIds] } },
            include: { project: true }
          })
        : [];
    const taskById = new Map(tasks.map((t) => [t.id, t]));

    for (const state of timerStates) {
      const task = taskById.get(state.taskId);
      if (!task) continue;
      activeMembers.push({
        userId: state.userId,
        userName: state.userName,
        projectName: task.project.name,
        taskName: task.taskName
      });
    }

    return {
      count: activeMembers.length,
      members: activeMembers
    };
  }
}
