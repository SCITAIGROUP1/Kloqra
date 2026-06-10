import type {
  CategoryProjectHeatmapResponseDto,
  DashboardReportDto,
  MyWeekQueryDto,
  MyWeekSummaryDto,
  ReportQueryDto,
  UtilizationQueryDto
} from "@kloqra/contracts";
import { buildPaginationMeta } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { ReportCacheService } from "../../../common/cache/report-cache.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { roundExport } from "../../../common/time/round.util";
import { TimeAggregationService } from "../../../common/time/time-aggregation.service";
import { getWeekStartDate, getWeekStartUtc } from "../../../common/time/week.util";

type HoursAgg = {
  totalHours: number;
  billableHours: number;
  billableAmount: number;
};

const HEATMAP_OTHER_ID = "00000000-0000-0000-0000-000000000000";

@Injectable()
export class ReportingService {
  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService,
    private reportCache: ReportCacheService
  ) {}

  async myWeekSummary(
    workspaceId: string,
    userId: string,
    query?: MyWeekQueryDto
  ): Promise<MyWeekSummaryDto> {
    const now = new Date();
    const weekStart = getWeekStartDate(now, "sunday");
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

  async dashboard(workspaceId: string, query: ReportQueryDto): Promise<DashboardReportDto> {
    const cacheKey = this.reportCache.dashboardKey(
      workspaceId,
      query.from,
      query.to,
      query.userId,
      query.projectId,
      query.categoryId,
      query.taskId
    );
    const cached = await this.reportCache.getDashboard(cacheKey);
    if (cached) return cached;

    const result = await this.buildDashboard(workspaceId, query);
    await this.reportCache.setDashboard(cacheKey, workspaceId, result);
    return result;
  }

  private async buildDashboard(
    workspaceId: string,
    query: ReportQueryDto
  ): Promise<DashboardReportDto> {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from,
      to,
      userId: query.userId,
      projectId: query.projectId,
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

    for (const log of logs) {
      const hours = log.durationSec / 3600;
      const billable = log.isBillable;
      const amount = billable
        ? hours *
          resolveRate(
            log.userId,
            log.task.projectId,
            log.user.defaultHourlyRate?.toNumber() ?? null
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
        currency: "USD" as const,
        activeProjects: activeProjects.size,
        activeMembers: activeMembers.size,
        billablePercent
      },
      timeByProject: [...byProject.entries()]
        .map(([projectId, v]) => this.toBreakdown(projectId, v))
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

  async utilization(workspaceId: string, query: UtilizationQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId }
    });

    const settings = (workspace.settings as Record<string, unknown>) ?? {};
    const expectedWeeklyHours = (settings.expectedWeeklyHours as number | undefined) ?? 40;

    const logs = await this.aggregation.fetchLogs(workspaceId, { from, to });

    // Days in range for target calculation
    const dayMs = 86_400_000;
    const calendarDays = Math.ceil((to.getTime() - from.getTime()) / dayMs) || 1;
    const targetHours = roundExport((expectedWeeklyHours / 5) * calendarDays);

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

    // Also include members who logged nothing (target still applies)
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true } } }
    });

    for (const m of members) {
      if (!byUser.has(m.userId)) {
        byUser.set(m.userId, { name: m.user.name, hours: 0, billableHours: 0 });
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
      rows = rows.filter((row) => row.userId === query.userId);
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

  async heatmap(workspaceId: string, query: ReportQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from,
      to,
      userId: query.userId,
      projectId: query.projectId,
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

  async tasks(workspaceId: string, query: ReportQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from,
      to,
      userId: query.userId,
      projectId: query.projectId,
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
    query: ReportQueryDto
  ): Promise<CategoryProjectHeatmapResponseDto> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from,
      to,
      userId: query.userId,
      projectId: query.projectId,
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
