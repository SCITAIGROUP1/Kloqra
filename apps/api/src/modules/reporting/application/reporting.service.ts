import { Injectable } from "@nestjs/common";
import type { MyWeekSummaryDto, ReportQueryDto } from "@chronomint/contracts";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { roundExport, TimeAggregationService } from "./time-aggregation.service";

type HoursAgg = {
  totalHours: number;
  billableHours: number;
  billableAmount: number;
};

@Injectable()
export class ReportingService {
  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService
  ) {}

  async myWeekSummary(workspaceId: string, userId: string): Promise<MyWeekSummaryDto> {
    const now = new Date();
    const weekStart = this.weekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const [todayLogs, weekLogs] = await Promise.all([
      this.aggregation.fetchLogs(workspaceId, {
        from: todayStart,
        to: todayEnd,
        userId
      }),
      this.aggregation.fetchLogs(workspaceId, {
        from: weekStart,
        to: weekEnd,
        userId
      })
    ]);

    const todayHours = roundExport(
      todayLogs.reduce((sum, l) => sum + l.durationSec / 3600, 0)
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
          projectColor: colorByProjectId.get(projectId) ?? "#6366f1",
          totalHours: roundExport(v.totalHours),
          billableHours: roundExport(v.billableHours)
        };
      })
      .sort((a, b) => b.totalHours - a.totalHours);

    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      todayHours,
      weekTotalHours: roundExport(weekTotalHours),
      weekBillableHours: roundExport(weekBillableHours),
      byProject
    };
  }

  async dashboard(workspaceId: string, query: ReportQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const logs = await this.prisma.timeLog.findMany({
      where: {
        task: { project: { workspaceId } },
        startTime: { gte: from, lte: to },
        ...(query.userId ? { userId: query.userId } : {}),
        ...(query.projectId ? { task: { projectId: query.projectId } } : {})
      },
      include: {
        user: true,
        task: { include: { project: true } }
      }
    });

    const rates = await this.prisma.hourlyRate.findMany({
      where: { workspaceId },
      orderBy: { effectiveFrom: "desc" }
    });

    const projectRate = new Map<string, number>();
    const userRate = new Map<string, number>();
    for (const r of rates) {
      if (r.projectId && !projectRate.has(r.projectId)) {
        projectRate.set(r.projectId, r.rate.toNumber());
      }
      if (r.userId && !userRate.has(r.userId)) {
        userRate.set(r.userId, r.rate.toNumber());
      }
    }

    const resolveRate = (userId: string, projectId: string, defaultRate: number | null) =>
      projectRate.get(projectId) ?? userRate.get(userId) ?? defaultRate ?? 0;

    const byProject = new Map<
      string,
      HoursAgg & { projectName: string }
    >();
    const byUser = new Map<string, HoursAgg & { userName: string }>();
    const weekly = new Map<string, HoursAgg>();
    const daily = new Map<string, HoursAgg>();

    const workspaceAgg: HoursAgg = {
      totalHours: 0,
      billableHours: 0,
      billableAmount: 0
    };
    const activeProjects = new Set<string>();
    const activeMembers = new Set<string>();

    for (const log of logs) {
      const hours = log.durationSec / 3600;
      const billable = log.isBillable;
      const amount = billable
        ? hours * resolveRate(log.userId, log.task.projectId, log.user.defaultHourlyRate?.toNumber() ?? null)
        : 0;

      activeProjects.add(log.task.projectId);
      activeMembers.add(log.userId);

      this.addHours(workspaceAgg, hours, billable, amount);

      const pid = log.task.projectId;
      const pEntry = byProject.get(pid) ?? {
        projectName: log.task.project.name,
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      this.addHours(pEntry, hours, billable, amount);
      byProject.set(pid, pEntry);

      const uEntry = byUser.get(log.userId) ?? {
        userName: log.user.name,
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      this.addHours(uEntry, hours, billable, amount);
      byUser.set(log.userId, uEntry);

      const weekKey = this.weekStart(log.startTime).toISOString().slice(0, 10);
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
    const billablePercent = wsTotal > 0 ? round((workspaceAgg.billableHours / wsTotal) * 100) : 0;

    const topProjectIds = [...byProject.entries()]
      .sort((a, b) => b[1].totalHours - a[1].totalHours)
      .slice(0, 6)
      .map(([id]) => id);
    const topProjectSet = new Set(topProjectIds);

    const dailyProjectStacks = new Map<string, Map<string, { projectName: string; hours: number }>>();
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
              hours: round(v.hours)
            };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);
        return { date, stacks };
      });

    return {
      period: { from: query.from, to: query.to },
      workspace: {
        totalHours: round(wsTotal),
        billableHours: round(workspaceAgg.billableHours),
        nonBillableHours: round(wsTotal - workspaceAgg.billableHours),
        totalAmount: round(workspaceAgg.billableAmount),
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

  private toBreakdown(
    projectId: string,
    v: HoursAgg & { projectName: string }
  ) {
    return {
      projectId,
      projectName: v.projectName,
      totalHours: round(v.totalHours),
      billableHours: round(v.billableHours),
      nonBillableHours: round(v.totalHours - v.billableHours),
      billableAmount: round(v.billableAmount)
    };
  }

  private stripName(v: HoursAgg & { projectName?: string; userName?: string }) {
    return {
      totalHours: round(v.totalHours),
      billableHours: round(v.billableHours),
      nonBillableHours: round(v.totalHours - v.billableHours),
      billableAmount: round(v.billableAmount)
    };
  }

  private weekStart(d: Date): Date {
    const copy = new Date(d);
    const day = copy.getUTCDay();
    copy.setUTCDate(copy.getUTCDate() - day);
    copy.setUTCHours(0, 0, 0, 0);
    return copy;
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
