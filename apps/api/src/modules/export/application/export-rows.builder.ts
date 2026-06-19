import {
  DEFAULT_EXPECTED_WEEKLY_HOURS,
  formatTimesheetPeriodLabel,
  parseWorkspaceSettings,
  type ExportFiltersDto,
  type ExportReportType
} from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { roundExport } from "../../../common/time/round.util";
import {
  TimeAggregationService,
  type TimeLogWithRelations
} from "../../../common/time/time-aggregation.service";
import { daysInRange, formatWeekLabel, getWeekStartUtc } from "../../../common/time/week.util";
import {
  formatExportClockTime,
  enumerateDateKeysInRange,
  formatExportDateKey,
  isWeekdayDateKey
} from "./export-format.util";
import { sortRowsForGroupBy } from "./export-sort.util";

export type ExportRowContext = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  settings: ReturnType<typeof parseWorkspaceSettings>;
  filters: ExportFiltersDto;
  from: Date;
  to: Date;
  logs: TimeLogWithRelations[];
  aggregates: ReturnType<TimeAggregationService["buildAggregates"]>;
  resolveRate: (
    userId: string,
    projectId: string,
    defaultRate: number | null,
    date?: Date | string | null
  ) => number;
};

function approvalPeriodForLabel(period: string | null | undefined): "daily" | "weekly" | "monthly" {
  if (period === "daily" || period === "monthly") return period;
  return "weekly";
}

@Injectable()
export class ExportRowsBuilder {
  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService
  ) {}

  async buildRows(
    report: ExportReportType,
    ctx: ExportRowContext
  ): Promise<Record<string, string | number>[]> {
    const groupBy = ctx.filters.groupBy ?? [];
    let rows: Record<string, string | number>[];

    switch (report) {
      case "time_entries":
        rows = this.buildTimeEntries(ctx);
        break;
      case "invoice":
        rows = this.buildInvoice(ctx);
        break;
      case "daily_summary":
        rows = this.buildDailySummary(ctx);
        break;
      case "weekly_summary":
        rows = await this.buildWeeklySummary(ctx);
        break;
      case "by_project":
        rows = this.buildByProject(ctx);
        break;
      case "by_member":
        rows = this.buildByMember(ctx);
        break;
      case "by_client":
        rows = this.buildByClient(ctx);
        break;
      case "by_task":
        rows = this.buildByTask(ctx);
        break;
      case "by_category":
        rows = this.buildByCategory(ctx);
        break;
      case "users_without_time":
        rows = await this.buildUsersWithoutTime(ctx);
        break;
      case "budget_vs_actual":
        rows = await this.buildBudgetVsActual(ctx);
        break;
      case "utilization":
        rows = await this.buildUtilization(ctx);
        break;
      case "member_daily_total":
        rows = this.buildMemberDailyTotal(ctx);
        break;
      case "member_project_breakdown":
        rows = this.buildMemberProjectBreakdown(ctx);
        break;
      case "missing_days":
        rows = await this.buildMissingDays(ctx);
        break;
      case "overtime_summary":
        rows = await this.buildOvertimeSummary(ctx);
        break;
      case "hours_by_source":
        rows = this.buildHoursBySource(ctx);
        break;
      case "timesheet_approval_status":
        rows = await this.buildTimesheetApprovalStatus(ctx);
        break;
      default:
        rows = [];
    }

    return sortRowsForGroupBy(rows, report, groupBy);
  }

  private buildTimeEntries(ctx: ExportRowContext): Record<string, string | number>[] {
    const timeZone = ctx.settings.timezone;
    return ctx.logs.map((l) =>
      this.logToTimeEntryRow(l, ctx.workspaceName, ctx.resolveRate, timeZone)
    );
  }

  private buildInvoice(ctx: ExportRowContext): Record<string, string | number>[] {
    const billableLogs = ctx.logs.filter((l) => l.isBillable);
    const rows = billableLogs.map((l) => {
      const hours = roundExport(l.durationSec / 3600);
      const rate = roundExport(
        ctx.resolveRate(
          l.userId,
          l.task.projectId,
          l.user.defaultHourlyRate?.toNumber() ?? null,
          l.startTime
        )
      );
      const categoryName = l.task.category?.name ?? "Uncategorized";
      return {
        client: l.task.project.clientName ?? "",
        project: l.task.project.name,
        category: categoryName,
        task: l.task.taskName,
        date: formatExportDateKey(l.startTime, ctx.settings.timezone),
        hours,
        rate,
        amount: roundExport(hours * rate),
        description: l.description ?? ""
      };
    });
    const subtotal = rows.reduce((s, r) => s + Number(r.amount), 0);
    rows.push({
      client: "",
      project: "",
      category: "",
      task: "",
      date: "",
      hours: 0,
      rate: 0,
      amount: roundExport(subtotal),
      description: "TOTAL"
    });
    return rows;
  }

  private logToTimeEntryRow(
    l: TimeLogWithRelations,
    workspaceName: string,
    resolveRate: ExportRowContext["resolveRate"],
    timeZone?: string
  ): Record<string, string | number> {
    const hours = roundExport(l.durationSec / 3600);
    const rate = roundExport(
      resolveRate(
        l.userId,
        l.task.projectId,
        l.user.defaultHourlyRate?.toNumber() ?? null,
        l.startTime
      )
    );
    const amount = l.isBillable ? roundExport(hours * rate) : 0;
    const categoryName = l.task.category?.name ?? "Uncategorized";
    return {
      workspace: workspaceName,
      client: l.task.project.clientName ?? "",
      project: l.task.project.name,
      category: categoryName,
      task: l.task.taskName,
      member: l.user.name,
      email: l.user.email,
      date: formatExportDateKey(l.startTime, timeZone),
      start_time: formatExportClockTime(l.startTime, timeZone),
      end_time: formatExportClockTime(l.endTime, timeZone),
      hours,
      billable: l.isBillable ? "yes" : "no",
      rate,
      amount,
      description: l.description ?? "",
      source: l.source
    };
  }

  private buildDailySummary(ctx: ExportRowContext): Record<string, string | number>[] {
    const rows: Record<string, string | number>[] = [];
    for (const [date, dayMap] of ctx.aggregates.daily) {
      for (const [, v] of dayMap) {
        rows.push({
          date,
          member: v.userName,
          email: v.userEmail,
          client: v.clientName ?? "",
          project: v.projectName,
          total_hours: roundExport(v.totalHours),
          billable_hours: roundExport(v.billableHours),
          non_billable_hours: roundExport(v.totalHours - v.billableHours),
          billable_amount: roundExport(v.billableAmount)
        });
      }
    }
    return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  private async buildWeeklySummary(
    ctx: ExportRowContext
  ): Promise<Record<string, string | number>[]> {
    const weekStartPref = ctx.settings.weekStart ?? "monday";
    const weekly = new Map<
      string,
      {
        userName: string;
        userEmail: string;
        projectName: string;
        clientName: string | null;
        totalHours: number;
        billableHours: number;
        billableAmount: number;
      }
    >();

    for (const log of ctx.logs) {
      const weekStart = getWeekStartUtc(log.startTime, weekStartPref);
      const key = `${weekStart}:${log.userId}:${log.task.projectId}`;
      const entry = weekly.get(key) ?? {
        userName: log.user.name,
        userEmail: log.user.email,
        projectName: log.task.project.name,
        clientName: log.task.project.clientName,
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      const hours = log.durationSec / 3600;
      entry.totalHours += hours;
      if (log.isBillable) {
        entry.billableHours += hours;
        entry.billableAmount +=
          hours *
          ctx.resolveRate(
            log.userId,
            log.task.projectId,
            log.user.defaultHourlyRate?.toNumber() ?? null,
            log.startTime
          );
      }
      weekly.set(key, entry);
    }

    return [...weekly.entries()]
      .map(([key, v]) => {
        const weekStart = key.split(":")[0]!;
        return {
          week_start: weekStart,
          week_label: formatWeekLabel(weekStart),
          member: v.userName,
          email: v.userEmail,
          client: v.clientName ?? "",
          project: v.projectName,
          total_hours: roundExport(v.totalHours),
          billable_hours: roundExport(v.billableHours),
          non_billable_hours: roundExport(v.totalHours - v.billableHours),
          billable_amount: roundExport(v.billableAmount)
        };
      })
      .sort((a, b) => String(a.week_start).localeCompare(String(b.week_start)));
  }

  private buildByProject(ctx: ExportRowContext): Record<string, string | number>[] {
    return [...ctx.aggregates.byProject.entries()]
      .map(([, v]) => ({
        project: v.projectName,
        client: v.clientName ?? "",
        total_hours: roundExport(v.totalHours),
        billable_hours: roundExport(v.billableHours),
        non_billable_hours: roundExport(v.totalHours - v.billableHours),
        billable_amount: roundExport(v.billableAmount),
        active_members: v.members.size
      }))
      .sort((a, b) => Number(b.total_hours) - Number(a.total_hours));
  }

  private buildByMember(ctx: ExportRowContext): Record<string, string | number>[] {
    return [...ctx.aggregates.byUser.entries()]
      .map(([, v]) => ({
        member: v.userName,
        email: v.userEmail,
        total_hours: roundExport(v.totalHours),
        billable_hours: roundExport(v.billableHours),
        non_billable_hours: roundExport(v.totalHours - v.billableHours),
        billable_amount: roundExport(v.billableAmount)
      }))
      .sort((a, b) => Number(b.total_hours) - Number(a.total_hours));
  }

  private buildByClient(ctx: ExportRowContext): Record<string, string | number>[] {
    const byClient = new Map<
      string,
      {
        totalHours: number;
        billableHours: number;
        billableAmount: number;
        projects: Set<string>;
      }
    >();

    for (const [, v] of ctx.aggregates.byProject) {
      const client = v.clientName?.trim() || "—";
      const entry = byClient.get(client) ?? {
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0,
        projects: new Set<string>()
      };
      entry.totalHours += v.totalHours;
      entry.billableHours += v.billableHours;
      entry.billableAmount += v.billableAmount;
      entry.projects.add(v.projectName);
      byClient.set(client, entry);
    }

    return [...byClient.entries()]
      .map(([client, v]) => ({
        client,
        total_hours: roundExport(v.totalHours),
        billable_hours: roundExport(v.billableHours),
        non_billable_hours: roundExport(v.totalHours - v.billableHours),
        billable_amount: roundExport(v.billableAmount),
        active_projects: v.projects.size
      }))
      .sort((a, b) => Number(b.total_hours) - Number(a.total_hours));
  }

  private buildByTask(ctx: ExportRowContext): Record<string, string | number>[] {
    const byTask = new Map<
      string,
      {
        taskName: string;
        categoryName: string;
        projectName: string;
        clientName: string | null;
        totalHours: number;
        billableHours: number;
        billableAmount: number;
      }
    >();

    for (const log of ctx.logs) {
      const key = log.taskId;
      const categoryName = log.task.category?.name ?? "Uncategorized";
      const entry = byTask.get(key) ?? {
        taskName: log.task.taskName,
        categoryName,
        projectName: log.task.project.name,
        clientName: log.task.project.clientName,
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      const hours = log.durationSec / 3600;
      entry.totalHours += hours;
      if (log.isBillable) {
        entry.billableHours += hours;
        entry.billableAmount +=
          hours *
          ctx.resolveRate(
            log.userId,
            log.task.projectId,
            log.user.defaultHourlyRate?.toNumber() ?? null,
            log.startTime
          );
      }
      byTask.set(key, entry);
    }

    return [...byTask.values()]
      .map((v) => ({
        task: v.taskName,
        category: v.categoryName,
        project: v.projectName,
        client: v.clientName ?? "",
        total_hours: roundExport(v.totalHours),
        billable_hours: roundExport(v.billableHours),
        non_billable_hours: roundExport(v.totalHours - v.billableHours),
        billable_amount: roundExport(v.billableAmount)
      }))
      .sort((a, b) => Number(b.total_hours) - Number(a.total_hours));
  }

  private buildByCategory(ctx: ExportRowContext): Record<string, string | number>[] {
    const byCategoryProject = new Map<
      string,
      {
        categoryName: string;
        projectName: string;
        clientName: string | null;
        totalHours: number;
        billableHours: number;
        billableAmount: number;
        tasks: Set<string>;
      }
    >();

    for (const log of ctx.logs) {
      const categoryId = log.task.category?.id ?? log.task.categoryId;
      const categoryName = log.task.category?.name ?? "Uncategorized";
      const key = `${categoryId}:${log.task.projectId}`;
      const entry = byCategoryProject.get(key) ?? {
        categoryName,
        projectName: log.task.project.name,
        clientName: log.task.project.clientName,
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0,
        tasks: new Set<string>()
      };
      const hours = log.durationSec / 3600;
      entry.tasks.add(log.taskId);
      entry.totalHours += hours;
      if (log.isBillable) {
        entry.billableHours += hours;
        entry.billableAmount +=
          hours *
          ctx.resolveRate(
            log.userId,
            log.task.projectId,
            log.user.defaultHourlyRate?.toNumber() ?? null,
            log.startTime
          );
      }
      byCategoryProject.set(key, entry);
    }

    return [...byCategoryProject.values()]
      .map((v) => ({
        category: v.categoryName,
        project: v.projectName,
        client: v.clientName ?? "",
        total_hours: roundExport(v.totalHours),
        billable_hours: roundExport(v.billableHours),
        non_billable_hours: roundExport(v.totalHours - v.billableHours),
        billable_amount: roundExport(v.billableAmount),
        active_tasks: v.tasks.size
      }))
      .sort((a, b) => Number(b.total_hours) - Number(a.total_hours));
  }

  private async buildUsersWithoutTime(
    ctx: ExportRowContext
  ): Promise<Record<string, string | number>[]> {
    const rangeDays = daysInRange(ctx.from, ctx.to);
    let memberUserIds: string[] | undefined;

    if (ctx.filters.projectId) {
      memberUserIds = await this.aggregation.teamMembersUserIds([ctx.filters.projectId]);
    } else if (ctx.filters.projectIds?.length) {
      memberUserIds = await this.aggregation.teamMembersUserIds(ctx.filters.projectIds);
    }

    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        ...(memberUserIds?.length ? { userId: { in: memberUserIds } } : {}),
        ...(ctx.filters.userIds?.length
          ? { userId: { in: ctx.filters.userIds } }
          : ctx.filters.userId
            ? { userId: ctx.filters.userId }
            : {})
      },
      include: { user: true }
    });

    const loggedUserIds = new Set(ctx.logs.map((l) => l.userId));
    const membersWithoutLogs = members.filter((m) => !loggedUserIds.has(m.userId));
    const userIds = membersWithoutLogs.map((m) => m.userId);

    const lastByUser = new Map<string, Date>();
    if (userIds.length > 0) {
      const lastLogs = await this.prisma.timeLog.findMany({
        where: {
          userId: { in: userIds },
          task: { project: { workspaceId: ctx.workspaceId } }
        },
        distinct: ["userId"],
        orderBy: [{ userId: "asc" }, { startTime: "desc" }],
        select: { userId: true, startTime: true }
      });
      for (const log of lastLogs) {
        lastByUser.set(log.userId, log.startTime);
      }
    }

    const rows = membersWithoutLogs.map((m) => {
      const lastLog = lastByUser.get(m.userId);
      return {
        member: m.user.name,
        email: m.user.email,
        last_log_date: lastLog ? formatExportDateKey(lastLog, ctx.settings.timezone) : "",
        days_without_logs: rangeDays
      };
    });

    return rows.sort((a, b) => String(a.member).localeCompare(String(b.member)));
  }

  private async buildBudgetVsActual(
    ctx: ExportRowContext
  ): Promise<Record<string, string | number>[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        isActive: true,
        ...(ctx.filters.projectIds?.length
          ? { id: { in: ctx.filters.projectIds } }
          : ctx.filters.projectId
            ? { id: ctx.filters.projectId }
            : {})
      }
    });

    return projects
      .map((p) => {
        const agg = ctx.aggregates.byProject.get(p.id);
        const logged = agg?.totalHours ?? 0;
        const budget = p.budgetHours?.toNumber() ?? null;
        const remaining = budget !== null ? roundExport(Math.max(0, budget - logged)) : "";
        const percentUsed =
          budget !== null && budget > 0 ? roundExport((logged / budget) * 100) : "";
        return {
          project: p.name,
          client: p.clientName ?? "",
          budget_hours: budget !== null ? roundExport(budget) : "",
          logged_hours: roundExport(logged),
          remaining_hours: remaining,
          percent_used: percentUsed,
          billable_amount: roundExport(agg?.billableAmount ?? 0)
        };
      })
      .sort((a, b) => Number(b.logged_hours) - Number(a.logged_hours));
  }

  private async buildUtilization(
    ctx: ExportRowContext
  ): Promise<Record<string, string | number>[]> {
    const weekStartPref = ctx.settings.weekStart ?? "monday";
    const expectedWeekly = ctx.settings.expectedWeeklyHours ?? DEFAULT_EXPECTED_WEEKLY_HOURS;

    const byMemberWeek = new Map<
      string,
      { userName: string; userEmail: string; loggedHours: number }
    >();

    for (const log of ctx.logs) {
      const weekStart = getWeekStartUtc(log.startTime, weekStartPref);
      const key = `${weekStart}:${log.userId}`;
      const entry = byMemberWeek.get(key) ?? {
        userName: log.user.name,
        userEmail: log.user.email,
        loggedHours: 0
      };
      entry.loggedHours += log.durationSec / 3600;
      byMemberWeek.set(key, entry);
    }

    return [...byMemberWeek.entries()]
      .map(([key, v]) => {
        const weekStart = key.split(":")[0]!;
        const logged = roundExport(v.loggedHours);
        const util = expectedWeekly > 0 ? roundExport((v.loggedHours / expectedWeekly) * 100) : 0;
        return {
          week_start: weekStart,
          week_label: formatWeekLabel(weekStart),
          member: v.userName,
          email: v.userEmail,
          logged_hours: logged,
          expected_hours: expectedWeekly,
          utilization_pct: util
        };
      })
      .sort((a, b) => String(a.week_start).localeCompare(String(b.week_start)));
  }

  private buildMemberDailyTotal(ctx: ExportRowContext): Record<string, string | number>[] {
    const byMemberDay = new Map<
      string,
      {
        userName: string;
        userEmail: string;
        totalHours: number;
        billableHours: number;
        billableAmount: number;
      }
    >();

    for (const [date, dayMap] of ctx.aggregates.daily) {
      for (const [, v] of dayMap) {
        const memberKey = `${date}:${v.userEmail}`;
        const entry = byMemberDay.get(memberKey) ?? {
          userName: v.userName,
          userEmail: v.userEmail,
          totalHours: 0,
          billableHours: 0,
          billableAmount: 0
        };
        entry.totalHours += v.totalHours;
        entry.billableHours += v.billableHours;
        entry.billableAmount += v.billableAmount;
        byMemberDay.set(memberKey, entry);
      }
    }

    return [...byMemberDay.entries()]
      .map(([key, v]) => {
        const date = key.split(":")[0]!;
        return {
          date,
          member: v.userName,
          email: v.userEmail,
          total_hours: roundExport(v.totalHours),
          billable_hours: roundExport(v.billableHours),
          non_billable_hours: roundExport(v.totalHours - v.billableHours),
          billable_amount: roundExport(v.billableAmount)
        };
      })
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  private buildMemberProjectBreakdown(ctx: ExportRowContext): Record<string, string | number>[] {
    const byKey = new Map<
      string,
      {
        userName: string;
        userEmail: string;
        projectName: string;
        clientName: string | null;
        totalHours: number;
        billableHours: number;
        billableAmount: number;
      }
    >();

    for (const log of ctx.logs) {
      const key = `${log.userId}:${log.task.projectId}`;
      const entry = byKey.get(key) ?? {
        userName: log.user.name,
        userEmail: log.user.email,
        projectName: log.task.project.name,
        clientName: log.task.project.clientName,
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      const hours = log.durationSec / 3600;
      entry.totalHours += hours;
      if (log.isBillable) {
        entry.billableHours += hours;
        entry.billableAmount +=
          hours *
          ctx.resolveRate(
            log.userId,
            log.task.projectId,
            log.user.defaultHourlyRate?.toNumber() ?? null,
            log.startTime
          );
      }
      byKey.set(key, entry);
    }

    return [...byKey.values()]
      .map((v) => ({
        member: v.userName,
        email: v.userEmail,
        project: v.projectName,
        client: v.clientName ?? "",
        total_hours: roundExport(v.totalHours),
        billable_hours: roundExport(v.billableHours),
        non_billable_hours: roundExport(v.totalHours - v.billableHours),
        billable_amount: roundExport(v.billableAmount)
      }))
      .sort((a, b) => String(a.member).localeCompare(String(b.member)));
  }

  private async buildMissingDays(
    ctx: ExportRowContext
  ): Promise<Record<string, string | number>[]> {
    let memberUserIds: string[] | undefined;
    if (ctx.filters.projectIds?.length) {
      memberUserIds = await this.aggregation.teamMembersUserIds(ctx.filters.projectIds);
    } else if (ctx.filters.projectId) {
      memberUserIds = await this.aggregation.teamMembersUserIds([ctx.filters.projectId]);
    }

    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        ...(memberUserIds?.length ? { userId: { in: memberUserIds } } : {}),
        ...(ctx.filters.userIds?.length
          ? { userId: { in: ctx.filters.userIds } }
          : ctx.filters.userId
            ? { userId: ctx.filters.userId }
            : {})
      },
      include: { user: true }
    });

    const timeZone = ctx.settings.timezone;
    const loggedByUserDay = new Set<string>();
    for (const log of ctx.logs) {
      loggedByUserDay.add(`${log.userId}:${formatExportDateKey(log.startTime, timeZone)}`);
    }

    const rows: Record<string, string | number>[] = [];
    for (const dateStr of enumerateDateKeysInRange(ctx.from, ctx.to, timeZone)) {
      if (!isWeekdayDateKey(dateStr)) continue;
      for (const m of members) {
        if (!loggedByUserDay.has(`${m.userId}:${dateStr}`)) {
          rows.push({
            member: m.user.name,
            email: m.user.email,
            date: dateStr,
            weekday: new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("en-US", {
              weekday: "short",
              timeZone: "UTC"
            })
          });
        }
      }
    }

    return rows.sort(
      (a, b) =>
        String(a.member).localeCompare(String(b.member)) ||
        String(a.date).localeCompare(String(b.date))
    );
  }

  private async buildOvertimeSummary(
    ctx: ExportRowContext
  ): Promise<Record<string, string | number>[]> {
    const utilization = await this.buildUtilization(ctx);
    return utilization.map((row) => {
      const logged = Number(row.logged_hours);
      const expected = Number(row.expected_hours);
      const over = logged > expected ? roundExport(logged - expected) : 0;
      const under = logged < expected ? roundExport(expected - logged) : 0;
      const status = over > 0 ? "over" : under > 0 ? "under" : "on_track";
      return {
        ...row,
        over_hours: over,
        under_hours: under,
        status
      };
    });
  }

  private buildHoursBySource(ctx: ExportRowContext): Record<string, string | number>[] {
    const byMember = new Map<
      string,
      { userName: string; userEmail: string; timer: number; manual: number }
    >();

    for (const log of ctx.logs) {
      const entry = byMember.get(log.userId) ?? {
        userName: log.user.name,
        userEmail: log.user.email,
        timer: 0,
        manual: 0
      };
      const hours = log.durationSec / 3600;
      if (log.source === "timer") entry.timer += hours;
      else entry.manual += hours;
      byMember.set(log.userId, entry);
    }

    return [...byMember.values()]
      .map((v) => ({
        member: v.userName,
        email: v.userEmail,
        timer_hours: roundExport(v.timer),
        manual_hours: roundExport(v.manual),
        total_hours: roundExport(v.timer + v.manual)
      }))
      .sort((a, b) => String(a.member).localeCompare(String(b.member)));
  }

  private async buildTimesheetApprovalStatus(
    ctx: ExportRowContext
  ): Promise<Record<string, string | number>[]> {
    const periods = await this.prisma.timesheetPeriod.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        periodStart: { lte: ctx.to },
        periodEnd: { gte: ctx.from },
        ...(ctx.filters.projectIds?.length
          ? { projectId: { in: ctx.filters.projectIds } }
          : ctx.filters.projectId
            ? { projectId: ctx.filters.projectId }
            : {}),
        ...(ctx.filters.userIds?.length
          ? { userId: { in: ctx.filters.userIds } }
          : ctx.filters.userId
            ? { userId: ctx.filters.userId }
            : {})
      },
      include: {
        user: { select: { name: true, email: true } },
        project: {
          select: { name: true, timesheetApprovalPeriod: true }
        }
      },
      orderBy: [{ user: { name: "asc" } }, { periodStart: "asc" }]
    });

    return periods.map((p) => ({
      member: p.user.name,
      email: p.user.email,
      project: p.project.name,
      period_label: formatTimesheetPeriodLabel(
        p.periodStart,
        approvalPeriodForLabel(p.project.timesheetApprovalPeriod)
      ),
      status: p.status,
      submitted_at: p.submittedAt ? formatExportDateKey(p.submittedAt, ctx.settings.timezone) : "",
      reviewed_at: p.reviewedAt ? formatExportDateKey(p.reviewedAt, ctx.settings.timezone) : "",
      review_note: p.reviewNote ?? ""
    }));
  }
}
