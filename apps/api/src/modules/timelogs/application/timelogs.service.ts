import type {
  CreateTimeLogDto,
  UpdateTimeLogDto,
  ListTimeLogsQueryDto,
  ListTimeLogsResponseDto
} from "@chronomint/contracts";
import { ErrorCodes } from "@chronomint/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { ReportCacheService } from "../../../common/cache/report-cache.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TimelogAuditService } from "./timelog-audit.service";
import { TimesheetLockService } from "./timesheet-lock.service";

const DEFAULT_LIST_LIMIT = 500;
const DEFAULT_LIST_LOOKBACK_DAYS = 90;

@Injectable()
export class TimelogsService {
  constructor(
    private prisma: PrismaService,
    private reportCache: ReportCacheService,
    private audit: TimelogAuditService,
    private timesheetLock: TimesheetLockService
  ) {}

  toDto(log: {
    id: string;
    userId: string;
    taskId: string;
    startTime: Date;
    endTime: Date;
    durationSec: number;
    description: string | null;
    isBillable: boolean;
    source: string;
  }) {
    return {
      id: log.id,
      userId: log.userId,
      taskId: log.taskId,
      startTime: log.startTime.toISOString(),
      endTime: log.endTime.toISOString(),
      durationSec: log.durationSec,
      description: log.description,
      isBillable: log.isBillable,
      source: log.source as "manual" | "timer"
    };
  }

  async list(
    workspaceId: string,
    userId: string,
    role: string,
    query: ListTimeLogsQueryDto
  ): Promise<ListTimeLogsResponseDto> {
    const filterUserId = role === "ADMIN" ? query.userId : userId;
    const limit = Math.min(query.limit ?? DEFAULT_LIST_LIMIT, 1000);

    let from = query.from ? new Date(query.from) : undefined;
    let to = query.to ? new Date(query.to) : undefined;
    if (!from && !to) {
      to = new Date();
      from = new Date(to);
      from.setDate(from.getDate() - DEFAULT_LIST_LOOKBACK_DAYS);
    }

    const logs = await this.prisma.timeLog.findMany({
      where: {
        ...(filterUserId ? { userId: filterUserId } : {}),
        ...(query.taskId ? { taskId: query.taskId } : {}),
        ...(from || to
          ? {
              AND: [
                ...(to ? [{ startTime: { lt: to } }] : []),
                ...(from ? [{ endTime: { gt: from } }] : [])
              ]
            }
          : {}),
        task: { project: { workspaceId } }
      },
      orderBy: { startTime: "desc" },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {})
    });

    const hasMore = logs.length > limit;
    const page = hasMore ? logs.slice(0, limit) : logs;

    return {
      items: page.map((l) => this.toDto(l)),
      nextCursor: hasMore ? page[page.length - 1]!.id : undefined
    };
  }

  async create(workspaceId: string, userId: string, dto: CreateTimeLogDto, actorId?: string) {
    await this.assertTaskInWorkspace(workspaceId, dto.taskId);
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    await this.timesheetLock.assertTaskPeriodEditable(userId, dto.taskId, start);
    await this.assertNoOverlap(userId, start, end);
    const task = await this.prisma.task.findUniqueOrThrow({ where: { id: dto.taskId } });

    const log = await this.prisma.$transaction(async (tx) => {
      const created = await tx.timeLog.create({
        data: {
          userId,
          taskId: dto.taskId,
          startTime: start,
          endTime: end,
          durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
          description: dto.description,
          isBillable: dto.isBillable ?? task.billableDefault,
          source: "manual"
        }
      });
      await this.audit.recordEvent(tx, {
        workspaceId,
        timeLogId: created.id,
        entryUserId: userId,
        actorId: actorId ?? userId,
        action: "CREATE",
        before: null,
        after: this.audit.snapshotFromLog(created)
      });
      return created;
    });

    await this.reportCache.invalidateWorkspace(workspaceId);
    return this.toDto(log);
  }

  async update(
    workspaceId: string,
    userId: string,
    role: string,
    id: string,
    dto: UpdateTimeLogDto
  ) {
    const log = await this.prisma.timeLog.findFirst({
      where: { id, task: { project: { workspaceId } } },
      include: { task: true }
    });
    if (!log)
      throw new DomainException(ErrorCodes.NOT_FOUND, "TimeLog not found", HttpStatus.NOT_FOUND);
    if (role !== "ADMIN" && log.userId !== userId) {
      throw new DomainException(ErrorCodes.FORBIDDEN, "Not your entry", HttpStatus.FORBIDDEN);
    }
    if (log.source === "timer") {
      throw new DomainException(
        ErrorCodes.TIMELOG_NOT_EDITABLE,
        "Timer entries cannot be edited",
        HttpStatus.FORBIDDEN
      );
    }

    await this.timesheetLock.assertPeriodEditable(log.userId, log.task.projectId, log.startTime);

    if (dto.taskId) await this.assertTaskInWorkspace(workspaceId, dto.taskId);
    const start = dto.startTime ? new Date(dto.startTime) : log.startTime;
    const end = dto.endTime ? new Date(dto.endTime) : log.endTime;

    if (dto.startTime) {
      const targetProjectId = dto.taskId
        ? (await this.prisma.task.findUniqueOrThrow({ where: { id: dto.taskId } })).projectId
        : log.task.projectId;
      await this.timesheetLock.assertPeriodEditable(log.userId, targetProjectId, start);
    }
    if (dto.taskId && dto.taskId !== log.taskId) {
      const targetTask = await this.prisma.task.findUniqueOrThrow({ where: { id: dto.taskId } });
      await this.timesheetLock.assertPeriodEditable(log.userId, targetTask.projectId, start);
    }

    await this.assertNoOverlap(log.userId, start, end, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.timeLog.update({
        where: { id },
        data: {
          ...(dto.taskId !== undefined ? { taskId: dto.taskId } : {}),
          startTime: start,
          endTime: end,
          durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.isBillable !== undefined ? { isBillable: dto.isBillable } : {})
        }
      });
      await this.audit.recordEvent(tx, {
        workspaceId,
        timeLogId: row.id,
        entryUserId: log.userId,
        actorId: userId,
        action: "UPDATE",
        before: this.audit.snapshotFromLog(log),
        after: this.audit.snapshotFromLog(row)
      });
      return row;
    });

    await this.reportCache.invalidateWorkspace(workspaceId);
    return this.toDto(updated);
  }

  async yesterdaySummary(
    workspaceId: string,
    userId: string,
    from: Date,
    to: Date
  ): Promise<{ totalSec: number; billableSec: number; topTask: string | null; logCount: number }> {
    const logs = await this.prisma.timeLog.findMany({
      where: {
        userId,
        startTime: { gte: from },
        endTime: { lte: to },
        task: { project: { workspaceId } }
      },
      include: { task: { select: { taskName: true } } },
      orderBy: { startTime: "asc" }
    });

    const totalSec = logs.reduce((sum, l) => sum + l.durationSec, 0);
    const billableSec = logs.filter((l) => l.isBillable).reduce((sum, l) => sum + l.durationSec, 0);

    // Find top task by total duration
    const byTask: Record<string, { name: string; sec: number }> = {};
    for (const log of logs) {
      const id = log.taskId;
      if (!byTask[id]) byTask[id] = { name: log.task.taskName, sec: 0 };
      byTask[id].sec += log.durationSec;
    }
    const topTask = Object.values(byTask).sort((a, b) => b.sec - a.sec)[0]?.name ?? null;

    return { totalSec, billableSec, topTask, logCount: logs.length };
  }

  async remove(workspaceId: string, userId: string, role: string, id: string) {
    const log = await this.prisma.timeLog.findFirst({
      where: { id, task: { project: { workspaceId } } },
      include: { task: true }
    });
    if (!log)
      throw new DomainException(ErrorCodes.NOT_FOUND, "TimeLog not found", HttpStatus.NOT_FOUND);
    if (role !== "ADMIN" && log.userId !== userId) {
      throw new DomainException(ErrorCodes.FORBIDDEN, "Not your entry", HttpStatus.FORBIDDEN);
    }

    await this.timesheetLock.assertPeriodEditable(log.userId, log.task.projectId, log.startTime);

    await this.prisma.$transaction(async (tx) => {
      await this.audit.recordEvent(tx, {
        workspaceId,
        timeLogId: log.id,
        entryUserId: log.userId,
        actorId: userId,
        action: "DELETE",
        before: this.audit.snapshotFromLog(log),
        after: null
      });
      await tx.timeLog.delete({ where: { id } });
    });

    await this.reportCache.invalidateWorkspace(workspaceId);
    return { ok: true };
  }

  private async assertTaskInWorkspace(workspaceId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, project: { workspaceId } }
    });
    if (!task)
      throw new DomainException(ErrorCodes.NOT_FOUND, "Task not found", HttpStatus.NOT_FOUND);
  }

  private async assertNoOverlap(userId: string, start: Date, end: Date, excludeId?: string) {
    const overlap = await this.prisma.timeLog.findFirst({
      where: {
        userId,
        id: excludeId ? { not: excludeId } : undefined,
        startTime: { lt: end },
        endTime: { gt: start }
      }
    });
    if (overlap) {
      throw new DomainException(
        ErrorCodes.TIMELOG_OVERLAP,
        "Overlapping time entry",
        HttpStatus.CONFLICT
      );
    }
  }
}
