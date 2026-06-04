import type { StartTimerDto, StopTimerDto } from "@chronomint/contracts";
import { ErrorCodes } from "@chronomint/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { ProjectAccessService } from "../../../common/access/project-access.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";

interface TimerState {
  userId: string;
  workspaceId: string;
  taskId: string;
  startedAt: string;
}

@Injectable()
export class TimerService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private access: ProjectAccessService
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
      startedAt: new Date().toISOString()
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
      elapsedSec: 0
    };
  }

  async active(workspaceId: string, userId: string) {
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
    const elapsedSec = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
    return {
      userId: state.userId,
      workspaceId: state.workspaceId,
      taskId: state.taskId,
      startedAt: state.startedAt,
      elapsedSec
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
    const start = new Date(state.startedAt);
    const end = new Date();
    const task = await this.prisma.task.findUniqueOrThrow({ where: { id: state.taskId } });

    const log = await this.prisma.timeLog.create({
      data: {
        userId,
        taskId: state.taskId,
        startTime: start,
        endTime: end,
        durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
        description: dto.description,
        isBillable: dto.isBillable ?? task.billableDefault,
        source: "timer"
      }
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
}
