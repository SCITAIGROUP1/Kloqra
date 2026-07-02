import type {
  CategoryProjectHeatmapResponseDto,
  DashboardReportDto,
  MyWeekQueryDto,
  MyWeekSummaryDto,
  ProjectSummaryDto,
  ProjectSummaryQueryDto,
  ReportQueryDto,
  UtilizationQueryDto
} from "@kloqra/contracts";
import { buildPaginationMeta, ErrorCodes, resolveEffectiveCurrency } from "@kloqra/contracts";
import {
  HttpStatus,
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy
} from "@nestjs/common";
import { ProjectAccessService } from "../../../common/access/project-access.service";
import { ReportCacheService } from "../../../common/cache/report-cache.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { parseWorkspaceSettingsFromRaw } from "../../../common/time/approval-period.util";
import { roundExport } from "../../../common/time/round.util";
import { TimeAggregationService } from "../../../common/time/time-aggregation.service";
import {
  getWeekStartDate,
  getWeekStartUtc,
  expectedHoursForRange
} from "../../../common/time/week.util";

type HoursAgg = {
  totalHours: number;
  billableHours: number;
  billableAmount: number;
};

const HEATMAP_OTHER_ID = "00000000-0000-0000-0000-000000000000";

@Injectable()
export class ReportingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReportingService.name);
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService,
    private reportCache: ReportCacheService,
    private access: ProjectAccessService
  ) {}

  onModuleInit() {
    if (!process.env.DATABASE_URL?.trim()) {
      return;
    }
    void this.cleanupExpiredShares().catch((err: unknown) => {
      this.logger.error(
        `Initial ReportShare cleanup failed: ${err instanceof Error ? err.message : String(err)}`
      );
    });
    this.cleanupTimer = setInterval(
      () => {
        void this.cleanupExpiredShares().catch((err: unknown) => {
          this.logger.error(
            `ReportShare cleanup failed: ${err instanceof Error ? err.message : String(err)}`
          );
        });
      },
      24 * 60 * 60 * 1000
    );
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  async cleanupExpiredShares() {
    const now = new Date();
    const [reportResult, widgetResult] = await Promise.all([
      this.prisma.reportShare.deleteMany({
        where: { expiresAt: { lt: now } }
      }),
      this.prisma.widgetShare.deleteMany({
        where: { expiresAt: { lt: now } }
      })
    ]);
    if (reportResult.count > 0) {
      this.logger.log(`Cleaned up ${reportResult.count} expired ReportShare records.`);
    }
    if (widgetResult.count > 0) {
      this.logger.log(`Cleaned up ${widgetResult.count} expired WidgetShare records.`);
    }
  }

  async projectSummary(
    workspaceId: string,
    projectId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    query: ProjectSummaryQueryDto
  ): Promise<ProjectSummaryDto> {
    await this.access.assertCanAccessProject(workspaceId, userId, role, projectId);

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true, name: true }
    });
    if (!project) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    }

    const from = new Date(query.from);
    const to = new Date(query.to);

    const manageableIds = await this.access.manageableProjectIds(workspaceId, userId, role);
    const canManage = manageableIds.includes(projectId);

    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from,
      to,
      projectId,
      ...(!canManage ? { userId } : {})
    });

    const byTask = new Map<
      string,
      {
        taskId: string | null;
        taskName: string;
        categoryId?: string;
        categoryName?: string;
        totalHours: number;
        billableHours: number;
      }
    >();
    const byCategory = new Map<
      string,
      { categoryId: string; categoryName: string; totalHours: number; billableHours: number }
    >();
    const byMember = new Map<
      string,
      { userId: string; userName: string; totalHours: number; billableHours: number }
    >();

    let totalHours = 0;
    let billableHours = 0;

    for (const log of logs) {
      const hours = log.durationSec / 3600;
      totalHours += hours;
      if (log.isBillable) billableHours += hours;

      const memberEntry = byMember.get(log.userId) ?? {
        userId: log.userId,
        userName: log.user.name,
        totalHours: 0,
        billableHours: 0
      };
      memberEntry.totalHours += hours;
      if (log.isBillable) memberEntry.billableHours += hours;
      byMember.set(log.userId, memberEntry);

      const taskKey = log.taskId;
      const taskEntry = byTask.get(taskKey) ?? {
        taskId: log.taskId,
        taskName: log.task.taskName || "General Work",
        categoryId: log.task.category?.id ?? log.task.categoryId,
        categoryName: log.task.category?.name ?? "Uncategorized",
        totalHours: 0,
        billableHours: 0
      };
      taskEntry.totalHours += hours;
      if (log.isBillable) taskEntry.billableHours += hours;
      byTask.set(taskKey, taskEntry);

      const categoryId = log.task.category?.id ?? log.task.categoryId;
      const categoryName = log.task.category?.name ?? "Uncategorized";
      const catEntry = byCategory.get(categoryId) ?? {
        categoryId,
        categoryName,
        totalHours: 0,
        billableHours: 0
      };
      catEntry.totalHours += hours;
      if (log.isBillable) catEntry.billableHours += hours;
      byCategory.set(categoryId, catEntry);
    }

    return {
      projectId: project.id,
      projectName: project.name,
      period: { from: query.from, to: query.to },
      totalHours: roundExport(totalHours),
      billableHours: roundExport(billableHours),
      nonBillableHours: roundExport(totalHours - billableHours),
      entryCount: logs.length,
      byTask: [...byTask.values()]
        .map((t) => ({
          taskId: t.taskId,
          taskName: t.taskName,
          categoryId: t.categoryId,
          categoryName: t.categoryName,
          totalHours: roundExport(t.totalHours),
          billableHours: roundExport(t.billableHours)
        }))
        .sort((a, b) => b.totalHours - a.totalHours),
      byCategory: [...byCategory.values()]
        .map((c) => ({
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          totalHours: roundExport(c.totalHours),
          billableHours: roundExport(c.billableHours)
        }))
        .sort((a, b) => b.totalHours - a.totalHours),
      byMember: [...byMember.values()]
        .map((m) => ({
          userId: m.userId,
          userName: m.userName,
          totalHours: roundExport(m.totalHours),
          billableHours: roundExport(m.billableHours)
        }))
        .sort((a, b) => b.totalHours - a.totalHours)
    };
  }

  async myWeekSummary(
    workspaceId: string,
    userId: string,
    query?: MyWeekQueryDto
  ): Promise<MyWeekSummaryDto> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true }
    });
    const settings = parseWorkspaceSettingsFromRaw(workspace?.settings);
    const weekStartPref = settings.weekStart ?? "sunday";

    const now = new Date();
    const weekStart = getWeekStartDate(now, weekStartPref);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const weekLogs = await this.aggregation.fetchLogs(workspaceId, {
      from: weekStart,
      to: weekEnd,
      userId,
      categoryId: query?.categoryId
    });

    const todayHours = roundExport(
      weekLogs
        .filter((l) => l.startTime >= todayStart && l.startTime <= todayEnd)
        .reduce((sum, l) => sum + l.durationSec / 3600, 0)
    );

    const { resolveRate } = await this.aggregation.resolveRateMaps(workspaceId);
    const weekAgg = this.aggregation.buildAggregates(weekLogs, resolveRate);

    const projectIds = [...weekAgg.byProject.keys()];
    const projectRows =
      projectIds.length > 0
        ? await this.prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, color: true }
          })
        : [];
    const colorByProjectId = new Map(projectRows.map((p) => [p.id, p.color]));

    let weekTotalHours = 0;
    let weekBillableHours = 0;
    const byProject = [...weekAgg.byProject.entries()]
      .map(([projectId, v]) => {
        weekTotalHours += v.totalHours;
        weekBillableHours += v.billableHours;
        return {
          projectId,
          projectName: v.projectName,
          projectColor: colorByProjectId.get(projectId) ?? "#236bfe",
          totalHours: roundExport(v.totalHours),
          billableHours: roundExport(v.billableHours)
        };
      })
      .sort((a, b) => b.totalHours - a.totalHours);

    const byCategory = [...weekAgg.byCategory.entries()]
      .map(([categoryId, v]) => ({
        categoryId,
        categoryName: v.categoryName,
        totalHours: roundExport(v.totalHours),
        billableHours: roundExport(v.billableHours)
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      todayHours,
      weekTotalHours: roundExport(weekTotalHours),
      weekBillableHours: roundExport(weekBillableHours),
      byProject,
      byCategory
    };
  }

  async dashboard(
    workspaceId: string,
    query: ReportQueryDto,
    allowedProjectIds?: string[]
  ): Promise<DashboardReportDto> {
    const cacheKey = this.reportCache.dashboardKey(
      workspaceId,
      query.from,
      query.to,
      query.userId,
      query.projectId,
      query.categoryId,
      query.taskId,
      allowedProjectIds
    );
    const cached = await this.reportCache.getDashboard(cacheKey);
    if (cached) return cached;

    const result = await this.buildDashboard(workspaceId, query, allowedProjectIds);
    await this.reportCache.setDashboard(cacheKey, workspaceId, result);
    return result;
  }

  private async buildDashboard(
    workspaceId: string,
    query: ReportQueryDto,
    allowedProjectIds?: string[]
  ): Promise<DashboardReportDto> {
    const workspaceRow = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true }
    });
    const settings = parseWorkspaceSettingsFromRaw(workspaceRow?.settings);
    const currency = resolveEffectiveCurrency(settings);

    const from = new Date(query.from);
    const to = new Date(query.to);

    let finalProjectIds = allowedProjectIds;
    if (query.projectId) {
      if (allowedProjectIds !== undefined) {
        finalProjectIds = query.projectId.filter((p) => allowedProjectIds.includes(p));
      } else {
        finalProjectIds = query.projectId;
      }
    }

    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from,
      to,
      userIds: query.userId,
      projectIds: finalProjectIds,
      categoryId: query.categoryId,
      taskId: query.taskId
    });
    const { resolveRate } = await this.aggregation.resolveRateMaps(workspaceId);
    const { workspaceAgg, byProject, byUser, byCategory } = this.aggregation.buildAggregates(
      logs,
      resolveRate
    );

    const activeProjects = new Set(logs.map((l) => l.task.projectId));
    const activeMembers = new Set(logs.map((l) => l.userId));

    const weekly = new Map<string, HoursAgg>();
    const daily = new Map<string, HoursAgg>();

    const startDay = new Date(query.from);
    const endDay = new Date(query.to);
    const temp = new Date(startDay);
    while (temp <= endDay) {
      const dateKey = temp.toISOString().slice(0, 10);
      daily.set(dateKey, {
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      });
      temp.setUTCDate(temp.getUTCDate() + 1);
    }

    for (const log of logs) {
      const hours = log.durationSec / 3600;
      const billable = log.isBillable;
      const amount = billable
        ? hours *
          resolveRate(
            log.userId,
            log.task.projectId,
            log.user.defaultHourlyRate?.toNumber() ?? null,
            log.startTime
          )
        : 0;

      const weekKey = getWeekStartUtc(log.startTime, "sunday");
      const weekEntry = weekly.get(weekKey) ?? {
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      this.addHours(weekEntry, hours, billable, amount);
      weekly.set(weekKey, weekEntry);

      const dayKey = log.startTime.toISOString().slice(0, 10);
      const dayEntry = daily.get(dayKey) ?? {
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      this.addHours(dayEntry, hours, billable, amount);
      daily.set(dayKey, dayEntry);
    }

    const wsTotal = workspaceAgg.totalHours;
    const billablePercent =
      wsTotal > 0 ? roundExport((workspaceAgg.billableHours / wsTotal) * 100) : 0;

    const projectIds = [...byProject.keys()];
    const [budgetRows, cumulativeHoursByProject] = await Promise.all([
      projectIds.length > 0
        ? this.prisma.project.findMany({
            where: { id: { in: projectIds }, workspaceId },
            select: { id: true, budgetHours: true }
          })
        : Promise.resolve([]),
      this.cumulativeHoursByProject(workspaceId, projectIds)
    ]);
    const budgetByProject = new Map(
      budgetRows.map((p) => [p.id, p.budgetHours?.toNumber() ?? null])
    );

    const topProjectIds = [...byProject.entries()]
      .sort((a, b) => b[1].totalHours - a[1].totalHours)
      .slice(0, 6)
      .map(([id]) => id);
    const topProjectSet = new Set(topProjectIds);

    const dailyProjectStacks = new Map<
      string,
      Map<string, { projectName: string; hours: number }>
    >();
    for (const log of logs) {
      const pid = log.task.projectId;
      if (!topProjectSet.has(pid)) continue;
      const dayKey = log.startTime.toISOString().slice(0, 10);
      const dayMap = dailyProjectStacks.get(dayKey) ?? new Map();
      const entry = dayMap.get(pid) ?? {
        projectName: log.task.project.name,
        hours: 0
      };
      entry.hours += log.durationSec / 3600;
      dayMap.set(pid, entry);
      dailyProjectStacks.set(dayKey, dayMap);
    }

    const dailyByProject = [...daily.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date]) => {
        const dayMap = dailyProjectStacks.get(date) ?? new Map();
        const stacks = topProjectIds
          .map((projectId) => {
            const v = dayMap.get(projectId);
            if (!v || v.hours <= 0) return null;
            return {
              projectId,
              projectName: v.projectName,
              hours: roundExport(v.hours)
            };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);
        return { date, stacks };
      });

    return {
      period: { from: query.from, to: query.to },
      workspace: {
        totalHours: roundExport(wsTotal),
        billableHours: roundExport(workspaceAgg.billableHours),
        nonBillableHours: roundExport(wsTotal - workspaceAgg.billableHours),
        totalAmount: roundExport(workspaceAgg.billableAmount),
        currency,
        activeProjects: activeProjects.size,
        activeMembers: activeMembers.size,
        billablePercent
      },
      timeByProject: [...byProject.entries()]
        .map(([projectId, v]) => {
          const budgetHours = budgetByProject.get(projectId) ?? null;
          const totalLogged = cumulativeHoursByProject.get(projectId) ?? 0;
          return {
            ...this.toBreakdown(projectId, v),
            ...this.computeBudgetFields(budgetHours, totalLogged)
          };
        })
        .sort((a, b) => b.totalHours - a.totalHours),
      timeByUser: [...byUser.entries()]
        .map(([userId, v]) => ({
          userId,
          userName: v.userName,
          ...this.stripName(v)
        }))
        .sort((a, b) => b.totalHours - a.totalHours),
      timeByCategory: [...byCategory.entries()]
        .map(([categoryId, v]) => ({
          categoryId,
          categoryName: v.categoryName,
          totalHours: roundExport(v.totalHours),
          billableHours: roundExport(v.billableHours),
          nonBillableHours: roundExport(v.totalHours - v.billableHours),
          billableAmount: roundExport(v.billableAmount)
        }))
        .sort((a, b) => b.totalHours - a.totalHours),
      weeklyHours: [...weekly.entries()]
        .map(([weekStart, v]) => ({
          weekStart,
          ...this.stripName(v)
        }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
      dailyHours: [...daily.entries()]
        .map(([date, v]) => ({
          date,
          ...this.stripName(v)
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      dailyByProject
    };
  }

  private async cumulativeHoursByProject(workspaceId: string, projectIds: string[]) {
    const totals = new Map<string, number>();
    if (projectIds.length === 0) return totals;

    const tasks = await this.prisma.task.findMany({
      where: { projectId: { in: projectIds }, project: { workspaceId } },
      select: { id: true, projectId: true }
    });
    if (tasks.length === 0) return totals;

    const taskToProject = new Map(tasks.map((t) => [t.id, t.projectId]));
    const grouped = await this.prisma.timeLog.groupBy({
      by: ["taskId"],
      where: { taskId: { in: tasks.map((t) => t.id) } },
      _sum: { durationSec: true }
    });

    for (const row of grouped) {
      const projectId = taskToProject.get(row.taskId);
      if (!projectId) continue;
      totals.set(projectId, (totals.get(projectId) ?? 0) + (row._sum.durationSec ?? 0) / 3600);
    }
    return totals;
  }

  private computeBudgetFields(budgetHours: number | null, totalLoggedHours: number) {
    if (budgetHours === null) {
      return {
        budgetHours: null,
        percentUsed: null,
        budgetStatus: "no_budget" as const
      };
    }
    const percentUsed = roundExport((totalLoggedHours / budgetHours) * 100);
    const status =
      totalLoggedHours >= budgetHours
        ? ("over_budget" as const)
        : totalLoggedHours >= budgetHours * 0.9
          ? ("near_budget" as const)
          : ("on_track" as const);
    return { budgetHours, percentUsed, budgetStatus: status };
  }

  private addHours(agg: HoursAgg, hours: number, billable: boolean, amount: number) {
    agg.totalHours += hours;
    if (billable) {
      agg.billableHours += hours;
      agg.billableAmount += amount;
    }
  }

  private toBreakdown(projectId: string, v: HoursAgg & { projectName: string }) {
    return {
      projectId,
      projectName: v.projectName,
      totalHours: roundExport(v.totalHours),
      billableHours: roundExport(v.billableHours),
      nonBillableHours: roundExport(v.totalHours - v.billableHours),
      billableAmount: roundExport(v.billableAmount)
    };
  }

  private stripName(v: HoursAgg) {
    return {
      totalHours: roundExport(v.totalHours),
      billableHours: roundExport(v.billableHours),
      nonBillableHours: roundExport(v.totalHours - v.billableHours),
      billableAmount: roundExport(v.billableAmount)
    };
  }

  // ── Budget Burn-Down ──────────────────────────────────────────────────────

  async budgetBurnDown(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true, name: true, color: true, budgetHours: true }
    });
    if (!project) return null;

    const budgetHours = project.budgetHours?.toNumber() ?? null;

    // Fetch all time logs for this project (no date cap — burn-down is cumulative)
    const logs = await this.aggregation.fetchLogs(workspaceId, {
      projectId,
      from: new Date(0),
      to: new Date("2100-01-01")
    });

    // Build daily cumulative totals
    const dailyMap = new Map<string, number>();
    for (const log of logs) {
      const day = log.startTime.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + log.durationSec / 3600);
    }

    const sortedDays = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let cumulative = 0;
    const burnDown = sortedDays.map(([date, hours]) => {
      cumulative += hours;
      return {
        date,
        hoursLogged: roundExport(hours),
        cumulativeHours: roundExport(cumulative),
        budgetRemaining: budgetHours !== null ? roundExport(budgetHours - cumulative) : null
      };
    });

    const totalLogged = roundExport(cumulative);
    const percentUsed = budgetHours ? roundExport((totalLogged / budgetHours) * 100) : null;

    return {
      projectId: project.id,
      projectName: project.name,
      projectColor: project.color,
      budgetHours,
      totalLoggedHours: totalLogged,
      percentUsed,
      status:
        budgetHours === null
          ? "no_budget"
          : totalLogged >= budgetHours
            ? "over_budget"
            : totalLogged >= budgetHours * 0.9
              ? "near_budget"
              : "on_track",
      burnDown
    };
  }

  // ── Team Utilization ──────────────────────────────────────────────────────

  async utilization(workspaceId: string, query: UtilizationQueryDto, allowedProjectIds?: string[]) {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId }
    });

    const settings = parseWorkspaceSettingsFromRaw(workspace.settings);
    const expectedWeeklyHours = settings.expectedWeeklyHours ?? 40;
    const targetHours = roundExport(expectedHoursForRange(from, to, expectedWeeklyHours));

    let finalProjectIds = allowedProjectIds;
    if (query.projectId) {
      const pIds = Array.isArray(query.projectId) ? query.projectId : [query.projectId];
      if (allowedProjectIds !== undefined) {
        finalProjectIds = pIds.filter((p) => allowedProjectIds.includes(p));
      } else {
        finalProjectIds = pIds;
      }
    }

    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from,
      to,
      userIds: query.userId,
      projectIds: finalProjectIds,
      categoryId: query.categoryId,
      taskId: query.taskId
    });

    const byUser = new Map<string, { name: string; hours: number; billableHours: number }>();
    for (const log of logs) {
      const e = byUser.get(log.userId) ?? {
        name: log.user.name,
        hours: 0,
        billableHours: 0
      };
      e.hours += log.durationSec / 3600;
      if (log.isBillable) e.billableHours += log.durationSec / 3600;
      byUser.set(log.userId, e);
    }

    // Include workspace members with zero logs (admin view only — skip for scoped public API keys)
    if (allowedProjectIds === undefined) {
      if (query.projectId && query.projectId.length > 0) {
        const teamMembers = await this.prisma.teamMember.findMany({
          where: {
            isActive: true,
            team: { projectId: { in: query.projectId }, project: { workspaceId } }
          },
          include: { user: { select: { id: true, name: true } } }
        });
        for (const m of teamMembers) {
          if (!byUser.has(m.userId)) {
            byUser.set(m.userId, { name: m.user.name, hours: 0, billableHours: 0 });
          }
        }
      } else {
        const members = await this.prisma.workspaceMember.findMany({
          where: { workspaceId },
          include: { user: { select: { id: true, name: true } } }
        });
        for (const m of members) {
          if (!byUser.has(m.userId)) {
            byUser.set(m.userId, { name: m.user.name, hours: 0, billableHours: 0 });
          }
        }
      }
    }

    let rows = [...byUser.entries()]
      .map(([userId, v]) => {
        const loggedHours = roundExport(v.hours);
        const billableHours = roundExport(v.billableHours);
        const utilizationPct = roundExport((loggedHours / targetHours) * 100);
        return {
          userId,
          userName: v.name,
          loggedHours,
          billableHours,
          targetHours,
          utilizationPct,
          status:
            utilizationPct >= 90
              ? ("on_track" as const)
              : utilizationPct >= 60
                ? ("low" as const)
                : ("critical" as const)
        };
      })
      .sort((a, b) => b.utilizationPct - a.utilizationPct);

    if (query.search) {
      const q = query.search.toLowerCase();
      rows = rows.filter((row) => row.userName.toLowerCase().includes(q));
    }
    if (query.userId) {
      const uIds = Array.isArray(query.userId) ? query.userId : [query.userId];
      if (uIds.length > 0) {
        rows = rows.filter((row) => uIds.includes(row.userId));
      }
    }

    const total = rows.length;
    const start = (query.page - 1) * query.limit;
    const pageMembers = rows.slice(start, start + query.limit);

    return {
      period: { from: query.from, to: query.to },
      expectedWeeklyHours,
      targetHours,
      members: pageMembers,
      ...buildPaginationMeta(total, query.page, query.limit)
    };
  }

  async heatmap(workspaceId: string, query: ReportQueryDto, allowedProjectIds?: string[]) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    let finalProjectIds = allowedProjectIds;
    if (query.projectId) {
      if (allowedProjectIds !== undefined) {
        finalProjectIds = query.projectId.filter((p) => allowedProjectIds.includes(p));
      } else {
        finalProjectIds = query.projectId;
      }
    }

    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from,
      to,
      userIds: query.userId,
      projectIds: finalProjectIds,
      categoryId: query.categoryId,
      taskId: query.taskId
    });

    const slotsMap = new Map<string, number>();
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      for (let hour = 0; hour < 24; hour++) {
        slotsMap.set(`${dayOfWeek}:${hour}`, 0);
      }
    }

    for (const log of logs) {
      const dayOfWeek = log.startTime.getUTCDay();
      const hour = log.startTime.getUTCHours();
      const hours = log.durationSec / 3600;
      const key = `${dayOfWeek}:${hour}`;
      slotsMap.set(key, (slotsMap.get(key) ?? 0) + hours);
    }

    const slots = [];
    for (const [key, value] of slotsMap.entries()) {
      const [dayOfWeek, hour] = key.split(":").map(Number);
      slots.push({
        dayOfWeek,
        hour,
        hours: roundExport(value)
      });
    }

    return { slots };
  }

  async tasks(workspaceId: string, query: ReportQueryDto, allowedProjectIds?: string[]) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    let finalProjectIds = allowedProjectIds;
    if (query.projectId) {
      if (allowedProjectIds !== undefined) {
        finalProjectIds = query.projectId.filter((p) => allowedProjectIds.includes(p));
      } else {
        finalProjectIds = query.projectId;
      }
    }

    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from,
      to,
      userIds: query.userId,
      projectIds: finalProjectIds,
      categoryId: query.categoryId,
      taskId: query.taskId
    });

    const tasksMap = new Map<
      string,
      {
        taskId: string | null;
        taskName: string;
        categoryId?: string;
        categoryName?: string;
        totalHours: number;
        billableHours: number;
      }
    >();

    for (const log of logs) {
      const name = log.task.taskName || "General Work";
      const key = name.toLowerCase().trim();
      const categoryId = log.task.category?.id ?? log.task.categoryId;
      const categoryName = log.task.category?.name ?? "Uncategorized";
      const entry = tasksMap.get(key) ?? {
        taskId: log.taskId,
        taskName: name,
        categoryId,
        categoryName,
        totalHours: 0,
        billableHours: 0
      };

      const hours = log.durationSec / 3600;
      entry.totalHours += hours;
      if (log.isBillable) {
        entry.billableHours += hours;
      }
      tasksMap.set(key, entry);
    }

    const sortedTasks = [...tasksMap.values()]
      .map((t) => ({
        taskId: t.taskId,
        taskName: t.taskName,
        categoryId: t.categoryId,
        categoryName: t.categoryName,
        totalHours: roundExport(t.totalHours),
        billableHours: roundExport(t.billableHours)
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    const top = sortedTasks.slice(0, 8);
    const rest = sortedTasks.slice(8);

    if (rest.length > 0) {
      const restTotal = rest.reduce((s, r) => s + r.totalHours, 0);
      const restBillable = rest.reduce((s, r) => s + r.billableHours, 0);
      top.push({
        taskId: null,
        taskName: "Other Tasks",
        categoryId: undefined,
        categoryName: undefined,
        totalHours: roundExport(restTotal),
        billableHours: roundExport(restBillable)
      });
    }

    return { tasks: top };
  }

  async categoryProjectHeatmap(
    workspaceId: string,
    query: ReportQueryDto,
    allowedProjectIds?: string[]
  ): Promise<CategoryProjectHeatmapResponseDto> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    let finalProjectIds = allowedProjectIds;
    if (query.projectId) {
      if (allowedProjectIds !== undefined) {
        finalProjectIds = query.projectId.filter((p) => allowedProjectIds.includes(p));
      } else {
        finalProjectIds = query.projectId;
      }
    }

    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from,
      to,
      userIds: query.userId,
      projectIds: finalProjectIds,
      categoryId: query.categoryId,
      taskId: query.taskId
    });

    const TOP_N = 8;
    const cellMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        projectId: string;
        projectName: string;
        hours: number;
      }
    >();
    const categoryTotals = new Map<
      string,
      { categoryId: string; categoryName: string; hours: number }
    >();
    const projectTotals = new Map<
      string,
      { projectId: string; projectName: string; hours: number }
    >();

    for (const log of logs) {
      const hours = log.durationSec / 3600;
      const categoryId = log.task.category?.id ?? log.task.categoryId;
      const categoryName = log.task.category?.name ?? "Uncategorized";
      const projectId = log.task.projectId;
      const projectName = log.task.project.name;

      const cat = categoryTotals.get(categoryId) ?? { categoryId, categoryName, hours: 0 };
      cat.hours += hours;
      categoryTotals.set(categoryId, cat);

      const proj = projectTotals.get(projectId) ?? { projectId, projectName, hours: 0 };
      proj.hours += hours;
      projectTotals.set(projectId, proj);

      const key = `${categoryId}:${projectId}`;
      const cell = cellMap.get(key) ?? {
        categoryId,
        categoryName,
        projectId,
        projectName,
        hours: 0
      };
      cell.hours += hours;
      cellMap.set(key, cell);
    }

    const topCategories = [...categoryTotals.values()]
      .sort((a, b) => b.hours - a.hours)
      .slice(0, TOP_N);
    const topCategoryIds = new Set(topCategories.map((c) => c.categoryId));
    const topProjects = [...projectTotals.values()]
      .sort((a, b) => b.hours - a.hours)
      .slice(0, TOP_N);
    const topProjectIds = new Set(topProjects.map((p) => p.projectId));

    const categories = topCategories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName
    }));
    const projects = topProjects.map((p) => ({
      projectId: p.projectId,
      projectName: p.projectName
    }));

    if (categoryTotals.size > TOP_N) {
      categories.push({ categoryId: HEATMAP_OTHER_ID, categoryName: "Other" });
    }
    if (projectTotals.size > TOP_N) {
      projects.push({ projectId: HEATMAP_OTHER_ID, projectName: "Other" });
    }

    const cells: CategoryProjectHeatmapResponseDto["cells"] = [];
    let otherHours = 0;

    for (const cell of cellMap.values()) {
      const catIsOther = !topCategoryIds.has(cell.categoryId);
      const projIsOther = !topProjectIds.has(cell.projectId);
      if (catIsOther || projIsOther) {
        otherHours += cell.hours;
        continue;
      }
      cells.push({
        categoryId: cell.categoryId,
        categoryName: cell.categoryName,
        projectId: cell.projectId,
        projectName: cell.projectName,
        hours: roundExport(cell.hours)
      });
    }

    if (otherHours > 0 && categories.some((c) => c.categoryId === HEATMAP_OTHER_ID)) {
      cells.push({
        categoryId: HEATMAP_OTHER_ID,
        categoryName: "Other",
        projectId: HEATMAP_OTHER_ID,
        projectName: "Other",
        hours: roundExport(otherHours)
      });
    }

    return { categories, projects, cells };
  }
}
