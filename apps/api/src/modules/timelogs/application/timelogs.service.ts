import type {
  CreateTimeLogDto,
  UpdateTimeLogDto,
  ListTimeLogsQueryDto,
  ListTimeLogsResponseDto,
  ListTimeLogOccupancyQueryDto,
  ListTimeLogOccupancyResponseDto,
  CreateBatchTimeLogsDto,
  BatchTimeLogsResponseDto
} from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { ProjectAccessService } from "../../../common/access/project-access.service";
import { ReportCacheService } from "../../../common/cache/report-cache.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  getPeriodRange,
  parseWorkspaceSettingsFromRaw,
  resolveApprovalPeriod
} from "../../../common/time/approval-period.util";
import { SubscriptionsService } from "../../subscriptions/application/subscriptions.service";
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
    private timesheetLock: TimesheetLockService,
    private access: ProjectAccessService,
    private subscriptions: SubscriptionsService
  ) {}

  resolveBillable(
    role: string,
    isManager: boolean,
    taskBillableDefault: boolean,
    requested?: boolean
  ): boolean {
    if (role === "ADMIN" || isManager) {
      return requested ?? taskBillableDefault;
    }
    return taskBillableDefault;
  }

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
    query: ListTimeLogsQueryDto,
    managedProjectIds: string[] = []
  ): Promise<ListTimeLogsResponseDto> {
    const limit = Math.min(query.limit ?? DEFAULT_LIST_LIMIT, 1000);

    let from = query.from ? new Date(query.from) : undefined;
    let to = query.to ? new Date(query.to) : undefined;
    if (!from && !to) {
      to = new Date();
      from = new Date(to);
      from.setDate(from.getDate() - DEFAULT_LIST_LOOKBACK_DAYS);
    }

    const isGlobalAdmin = role === "ADMIN";
    const hasManagedProjects = managedProjectIds.length > 0;

    // If not admin, and querying for another user, they must be a project manager
    // and they can ONLY see logs for projects they manage.
    let restrictToOwnLogs = false;
    let overrideProjectIds: string[] | undefined = undefined;

    let isQueryingOtherUsers = false;
    if (query.userId) {
      if (Array.isArray(query.userId)) {
        isQueryingOtherUsers = query.userId.some((id) => id !== userId);
      } else {
        isQueryingOtherUsers = query.userId !== userId;
      }
    }

    if (!isGlobalAdmin) {
      if (query.userId && isQueryingOtherUsers) {
        if (!hasManagedProjects) {
          restrictToOwnLogs = true;
        } else {
          // They are a PM querying someone else's logs. Restrict to projects they manage.
          overrideProjectIds = managedProjectIds;
        }
      } else if (!query.userId && hasManagedProjects) {
        // Querying all users' logs. They can see their own logs for ANY project,
        // and ANY user's logs for projects they manage.
        // This requires an OR clause, so we handle it below.
      } else if (!query.userId && !hasManagedProjects) {
        restrictToOwnLogs = true;
      }
    }

    const filterUserId = restrictToOwnLogs ? userId : query.userId;

    const taskWhere = query.taskId
      ? { project: { workspaceId } }
      : {
          ...(query.projectId
            ? Array.isArray(query.projectId)
              ? { projectId: { in: query.projectId } }
              : { projectId: query.projectId }
            : {}),
          ...(overrideProjectIds ? { projectId: { in: overrideProjectIds } } : {}),
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          project: { workspaceId }
        };

    const searchTerm = query.search?.trim();
    const searchFilter = searchTerm
      ? {
          OR: [
            { description: { contains: searchTerm, mode: "insensitive" as const } },
            { task: { taskName: { contains: searchTerm, mode: "insensitive" as const } } },
            { task: { project: { name: { contains: searchTerm, mode: "insensitive" as const } } } },
            {
              task: {
                category: { name: { contains: searchTerm, mode: "insensitive" as const } }
              }
            }
          ]
        }
      : undefined;

    let cursorObj: { id_startTime: { id: string; startTime: Date } } | undefined = undefined;
    if (query.cursor) {
      const colonIdx = query.cursor.indexOf(":");
      if (colonIdx !== -1) {
        const id = query.cursor.slice(0, colonIdx);
        const startTimeStr = query.cursor.slice(colonIdx + 1);
        cursorObj = {
          id_startTime: {
            id,
            startTime: new Date(startTimeStr)
          }
        };
      }
    }

    const baseWhere = {
      ...(filterUserId
        ? Array.isArray(filterUserId)
          ? { userId: { in: filterUserId } }
          : { userId: filterUserId }
        : {}),
      ...(query.taskId ? { taskId: query.taskId } : {}),
      ...(query.billableOnly ? { isBillable: true } : {}),
      ...(from || to
        ? {
            AND: [
              ...(to ? [{ startTime: { lt: to } }] : []),
              ...(from ? [{ endTime: { gt: from } }] : [])
            ]
          }
        : {}),
      ...(searchFilter ? { AND: [searchFilter] } : {}),
      task: taskWhere
    };

    // If a PM is querying ALL logs, they can see:
    // 1. Their own logs (any project)
    // 2. Anyone's logs for projects they manage
    const finalWhere =
      !isGlobalAdmin && hasManagedProjects && !query.userId
        ? {
            AND: [
              baseWhere,
              {
                OR: [{ userId }, { task: { projectId: { in: managedProjectIds } } }]
              }
            ]
          }
        : baseWhere;

    const logs = await this.prisma.timeLog.findMany({
      where: finalWhere,
      orderBy: { startTime: "desc" },
      take: limit + 1,
      ...(cursorObj ? { cursor: cursorObj, skip: 1 } : {})
    });

    const hasMore = logs.length > limit;
    const page = hasMore ? logs.slice(0, limit) : logs;

    return {
      items: page.map((l) => this.toDto(l)),
      nextCursor: hasMore
        ? `${page[page.length - 1]!.id}:${page[page.length - 1]!.startTime.toISOString()}`
        : undefined
    };
  }

  async listOccupancy(
    userId: string,
    role: string,
    query: ListTimeLogOccupancyQueryDto
  ): Promise<ListTimeLogOccupancyResponseDto> {
    if (role === "ADMIN") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Occupancy is only available for members",
        HttpStatus.FORBIDDEN
      );
    }

    const from = new Date(query.from);
    const to = new Date(query.to);

    const logs = await this.prisma.timeLog.findMany({
      where: {
        userId,
        startTime: { lt: to },
        endTime: { gt: from },
        task: {
          project: {
            workspace: { members: { some: { userId } } }
          }
        }
      },
      include: {
        task: {
          include: {
            project: {
              include: { workspace: { select: { id: true, name: true } } }
            }
          }
        }
      },
      orderBy: { startTime: "asc" }
    });

    const projectIds = [...new Set(logs.map((log) => log.task.projectId))];
    const projects =
      projectIds.length > 0
        ? await this.prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: {
              id: true,
              timesheetApprovalEnabled: true,
              timesheetApprovalPeriod: true,
              workspace: { select: { settings: true } }
            }
          })
        : [];

    const projectConfigMap = new Map<
      string,
      {
        enabled: boolean;
        workspaceSettings: any;
        approvalPeriod: any;
      }
    >();

    for (const proj of projects) {
      const workspaceSettings = parseWorkspaceSettingsFromRaw(proj.workspace.settings);
      const approvalPeriod = resolveApprovalPeriod(proj.timesheetApprovalPeriod, workspaceSettings);
      projectConfigMap.set(proj.id, {
        enabled: proj.timesheetApprovalEnabled,
        workspaceSettings,
        approvalPeriod
      });
    }

    const uniquePeriodStarts = new Map<string, { projectId: string; periodStart: Date }>();
    for (const log of logs) {
      const projectId = log.task.projectId;
      const config = projectConfigMap.get(projectId);
      if (config?.enabled) {
        const { periodStart } = getPeriodRange(
          log.startTime,
          config.approvalPeriod,
          config.workspaceSettings
        );
        const key = `${projectId}:${periodStart.toISOString()}`;
        uniquePeriodStarts.set(key, { projectId, periodStart });
      }
    }

    const periodsList = Array.from(uniquePeriodStarts.values());
    const periodStatuses = new Map<string, string>();

    if (periodsList.length > 0) {
      const periods = await this.prisma.timesheetPeriod.findMany({
        where: {
          userId,
          OR: periodsList.map(({ projectId, periodStart }) => ({
            projectId,
            periodStart
          }))
        },
        select: {
          projectId: true,
          periodStart: true,
          status: true
        }
      });
      for (const p of periods) {
        const key = `${p.projectId}:${p.periodStart.toISOString()}`;
        periodStatuses.set(key, p.status);
      }
    }

    const items = logs.map((log) => {
      const projectId = log.task.projectId;
      const config = projectConfigMap.get(projectId);
      let isLocked = false;

      if (config?.enabled) {
        const { periodStart } = getPeriodRange(
          log.startTime,
          config.approvalPeriod,
          config.workspaceSettings
        );
        const key = `${projectId}:${periodStart.toISOString()}`;
        const status = periodStatuses.get(key) ?? "DRAFT";
        isLocked = status === "SUBMITTED" || status === "APPROVED";
      }

      return {
        id: log.id,
        startTime: log.startTime.toISOString(),
        endTime: log.endTime.toISOString(),
        workspaceId: log.task.project.workspace.id,
        workspaceName: log.task.project.workspace.name,
        label: `${log.task.project.name} — ${log.task.taskName}`,
        source: log.source as "manual" | "timer",
        isLocked
      };
    });

    return { items };
  }

  /**
   * Access check path:
   * 1. access.assertCanLogTask() → validates workspace membership + team membership for MEMBERs
   * 2. timesheetLock.assertTaskPeriodEditable() → blocks writes to locked periods
   * 3. assertNoOverlap() → prevents time overlap across all workspaces
   * NOTE: assertTaskInWorkspace() is covered transitively via assertCanLogTask → task project lookup
   */
  async create(
    workspaceId: string,
    userId: string,
    role: string,
    dto: CreateTimeLogDto,
    actorId?: string
  ) {
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { tenantId: true }
    });
    await this.subscriptions.assertSubscriptionAllowsWrites(workspace.tenantId);

    await this.access.assertCanLogTask(workspaceId, userId, role as "ADMIN" | "MEMBER", dto.taskId);
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    await this.timesheetLock.assertTaskPeriodEditable(userId, dto.taskId, start);
    await this.assertNoOverlap(userId, start, end);
    const task = await this.prisma.task.findUniqueOrThrow({ where: { id: dto.taskId } });

    const manageableIds = await this.access.manageableProjectIds(
      workspaceId,
      userId,
      role as "ADMIN" | "MEMBER"
    );
    const isManager = manageableIds.includes(task.projectId);

    const log = await this.prisma.$transaction(async (tx) => {
      const created = await tx.timeLog.create({
        data: {
          userId,
          taskId: dto.taskId,
          startTime: start,
          endTime: end,
          durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
          description: dto.description,
          isBillable: this.resolveBillable(role, isManager, task.billableDefault, dto.isBillable),
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
      include: {
        task: {
          include: {
            category: { select: { isActive: true } },
            project: { select: { isActive: true } }
          }
        }
      }
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

    this.assertTimeLogEditable(log.task);

    await this.timesheetLock.assertPeriodEditable(log.userId, log.task.projectId, log.startTime);

    const targetTaskId = dto.taskId ?? log.taskId;
    await this.access.assertCanLogTask(
      workspaceId,
      log.userId,
      role as "ADMIN" | "MEMBER",
      targetTaskId
    );
    const start = dto.startTime ? new Date(dto.startTime) : log.startTime;
    const end = dto.endTime ? new Date(dto.endTime) : log.endTime;
    const targetTask = await this.prisma.task.findUniqueOrThrow({ where: { id: targetTaskId } });

    if (dto.startTime) {
      const targetProjectId = dto.taskId
        ? (await this.prisma.task.findUniqueOrThrow({ where: { id: dto.taskId } })).projectId
        : log.task.projectId;
      await this.timesheetLock.assertPeriodEditable(log.userId, targetProjectId, start);
    }
    if (dto.taskId && dto.taskId !== log.taskId) {
      await this.timesheetLock.assertPeriodEditable(log.userId, targetTask.projectId, start);
    }

    await this.assertNoOverlap(log.userId, start, end, id);

    const manageableIds = await this.access.manageableProjectIds(
      workspaceId,
      userId,
      role as "ADMIN" | "MEMBER"
    );
    const isManager = manageableIds.includes(targetTask.projectId);

    const isBillable = this.resolveBillable(
      role,
      isManager,
      targetTask.billableDefault,
      dto.isBillable !== undefined ? dto.isBillable : log.isBillable
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.timeLog.update({
        where: { id_startTime: { id, startTime: log.startTime } },
        data: {
          ...(dto.taskId !== undefined ? { taskId: dto.taskId } : {}),
          startTime: start,
          endTime: end,
          durationSec: Math.floor((end.getTime() - start.getTime()) / 1000),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          isBillable
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
      include: {
        task: {
          include: {
            category: { select: { isActive: true } },
            project: { select: { isActive: true } }
          }
        }
      }
    });
    if (!log)
      throw new DomainException(ErrorCodes.NOT_FOUND, "TimeLog not found", HttpStatus.NOT_FOUND);
    if (role !== "ADMIN" && log.userId !== userId) {
      throw new DomainException(ErrorCodes.FORBIDDEN, "Not your entry", HttpStatus.FORBIDDEN);
    }

    this.assertTimeLogEditable(log.task);

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
      await tx.timeLog.delete({ where: { id_startTime: { id, startTime: log.startTime } } });
    });

    await this.reportCache.invalidateWorkspace(workspaceId);
    return { ok: true };
  }

  private assertTimeLogEditable(task: {
    isActive: boolean;
    category: { isActive: boolean };
    project: { isActive: boolean };
  }) {
    if (task.project.isActive && task.category.isActive && task.isActive) {
      return;
    }
    const message = !task.project.isActive
      ? "Time entries for inactive projects cannot be changed"
      : !task.category.isActive
        ? "Time entries for inactive categories cannot be changed"
        : "Time entries for inactive tasks cannot be changed";
    throw new DomainException(ErrorCodes.TIMELOG_NOT_EDITABLE, message, HttpStatus.FORBIDDEN);
  }

  private async assertTaskInWorkspace(workspaceId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, project: { workspaceId } }
    });
    if (!task)
      throw new DomainException(ErrorCodes.NOT_FOUND, "Task not found", HttpStatus.NOT_FOUND);
  }

  private formatOverlapTimeRange(start: Date, end: Date): string {
    const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
    return `${start.toLocaleTimeString("en-US", opts)} – ${end.toLocaleTimeString("en-US", opts)}`;
  }

  async assertNoOverlap(userId: string, start: Date, end: Date, excludeId?: string) {
    const overlap = await this.prisma.timeLog.findFirst({
      where: {
        userId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startTime: { lt: end },
        endTime: { gt: start },
        task: {
          project: {
            workspace: { members: { some: { userId } } }
          }
        }
      },
      select: {
        description: true,
        startTime: true,
        endTime: true,
        source: true,
        task: {
          select: {
            taskName: true,
            project: { select: { name: true } }
          }
        }
      }
    });
    if (overlap) {
      const label = overlap.task
        ? `${overlap.task.project.name} · ${overlap.task.taskName}`
        : overlap.description?.trim() || "another entry";
      const range = this.formatOverlapTimeRange(overlap.startTime, overlap.endTime);
      const sourceHint =
        overlap.source !== "manual" ? " (from timer — edit or remove that entry first)" : "";
      throw new DomainException(
        ErrorCodes.TIMELOG_OVERLAP,
        `You can't log time for two projects at once. This overlaps "${label}" (${range})${sourceHint}.`,
        HttpStatus.CONFLICT
      );
    }
  }

  localTimeToUtc(localDate: string, localTime: string, timeZone: string): Date {
    const [y, m, d] = localDate.split("-").map(Number);
    const [h, min] = localTime.split(":").map(Number);
    const guess = new Date(Date.UTC(y!, m! - 1, d!, h!, min!, 0, 0));
    let utcMs = guess.getTime();
    for (let i = 0; i < 2; i++) {
      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).format(new Date(utcMs));
      const match = formatted.match(/(\d{2})\/(\d{2})\/(\d{4}),\s+(\d{2}):(\d{2}):(\d{2})/);
      if (!match) break;
      const [, lMonth, lDay, lYear, lHour, lMin, lSec] = match;
      const localGenerated = Date.UTC(
        Number(lYear),
        Number(lMonth) - 1,
        Number(lDay),
        Number(lHour),
        Number(lMin),
        Number(lSec)
      );
      const diff = guess.getTime() - localGenerated;
      if (diff === 0) break;
      utcMs += diff;
    }
    return new Date(utcMs);
  }

  async createBatch(
    workspaceId: string,
    userId: string,
    role: string,
    dto: CreateBatchTimeLogsDto,
    actorId?: string
  ): Promise<BatchTimeLogsResponseDto> {
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { tenantId: true }
    });
    await this.subscriptions.assertSubscriptionAllowsWrites(workspace.tenantId);

    await this.access.assertCanLogTask(workspaceId, userId, role as "ADMIN" | "MEMBER", dto.taskId);
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: dto.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    if (dto.endDate > todayStr) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "EndDate cannot be in the future",
        HttpStatus.BAD_REQUEST
      );
    }

    if (dto.startDate > dto.endDate) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "startDate must be <= endDate",
        HttpStatus.BAD_REQUEST
      );
    }

    const task = await this.prisma.task.findUniqueOrThrow({ where: { id: dto.taskId } });
    const manageableIds = await this.access.manageableProjectIds(
      workspaceId,
      userId,
      role as "ADMIN" | "MEMBER"
    );
    const isManager = manageableIds.includes(task.projectId);

    const createdItems: any[] = [];
    const skippedItems: { date: string; reason: string }[] = [];

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);

      if (dto.recurrence === "weekdays") {
        const dayOfWeek = d.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      } else if (dto.recurrence === "weekly") {
        const startDayOfWeek = start.getUTCDay();
        const currentDayOfWeek = d.getUTCDay();
        if (currentDayOfWeek !== startDayOfWeek) continue;
      }

      const startUtc = this.localTimeToUtc(dateStr, dto.localStartTime, dto.timezone);
      const endUtc = this.localTimeToUtc(dateStr, dto.localEndTime, dto.timezone);

      try {
        await this.timesheetLock.assertTaskPeriodEditable(userId, dto.taskId, startUtc);
      } catch (err) {
        skippedItems.push({
          date: dateStr,
          reason: err instanceof DomainException ? err.message : "Timesheet period is locked"
        });
        continue;
      }

      try {
        await this.assertNoOverlap(userId, startUtc, endUtc);
      } catch (err) {
        skippedItems.push({
          date: dateStr,
          reason: err instanceof DomainException ? err.message : "Time log overlap"
        });
        continue;
      }

      try {
        const log = await this.prisma.$transaction(async (tx) => {
          const created = await tx.timeLog.create({
            data: {
              userId,
              taskId: dto.taskId,
              startTime: startUtc,
              endTime: endUtc,
              durationSec: Math.floor((endUtc.getTime() - startUtc.getTime()) / 1000),
              description: dto.description ?? null,
              isBillable: this.resolveBillable(
                role,
                isManager,
                task.billableDefault,
                dto.isBillable
              ),
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
        createdItems.push(log);
      } catch (err) {
        skippedItems.push({
          date: dateStr,
          reason: err instanceof Error ? err.message : "Database write failed"
        });
      }
    }

    if (createdItems.length > 0) {
      await this.reportCache.invalidateWorkspace(workspaceId);
    }

    return {
      createdCount: createdItems.length,
      skippedCount: skippedItems.length,
      items: createdItems.map((item) => this.toDto(item)),
      skipped: skippedItems
    };
  }
}
