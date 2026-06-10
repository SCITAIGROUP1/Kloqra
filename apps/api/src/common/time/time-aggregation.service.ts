import type { ExportBillableFilter } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type TimeLogWithRelations = Awaited<ReturnType<TimeAggregationService["fetchLogs"]>>[number];

export type ExportFilters = {
  from: Date;
  to: Date;
  projectId?: string;
  userId?: string;
  userIds?: string[];
  categoryId?: string;
  taskId?: string;
  billable?: ExportBillableFilter;
};

const UNCATEGORIZED_LABEL = "Uncategorized";

function categoryMeta(log: {
  task: { categoryId: string; category: { id: string; name: string } | null };
}) {
  return {
    categoryId: log.task.category?.id ?? log.task.categoryId,
    categoryName: log.task.category?.name ?? UNCATEGORIZED_LABEL
  };
}

type HoursAgg = {
  totalHours: number;
  billableHours: number;
  billableAmount: number;
};

@Injectable()
export class TimeAggregationService {
  constructor(private prisma: PrismaService) {}

  async fetchLogs(workspaceId: string, filters: ExportFilters) {
    const billableWhere =
      filters.billable === "billable"
        ? { isBillable: true }
        : filters.billable === "non_billable"
          ? { isBillable: false }
          : {};

    const userWhere = filters.userIds?.length
      ? { userId: { in: filters.userIds } }
      : filters.userId
        ? { userId: filters.userId }
        : {};

    return this.prisma.timeLog.findMany({
      where: {
        ...(filters.taskId ? { taskId: filters.taskId } : {}),
        task: {
          ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
          project: {
            workspaceId,
            ...(filters.projectId ? { id: filters.projectId } : {})
          }
        },
        startTime: { gte: filters.from, lte: filters.to },
        ...billableWhere,
        ...userWhere
      },
      select: {
        id: true,
        userId: true,
        taskId: true,
        startTime: true,
        endTime: true,
        durationSec: true,
        description: true,
        isBillable: true,
        source: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            defaultHourlyRate: true
          }
        },
        task: {
          select: {
            id: true,
            taskName: true,
            projectId: true,
            categoryId: true,
            category: { select: { id: true, name: true } },
            project: {
              select: {
                id: true,
                name: true,
                clientName: true
              }
            }
          }
        }
      },
      orderBy: { startTime: "asc" }
    });
  }

  async resolveRateMaps(workspaceId: string) {
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

    return { resolveRate };
  }

  async teamMemberUserIds(projectId: string): Promise<string[]> {
    const team = await this.prisma.team.findUnique({
      where: { projectId },
      include: { members: true }
    });
    return team?.members.filter((m) => m.isActive).map((m) => m.userId) ?? [];
  }

  buildAggregates(
    logs: TimeLogWithRelations[],
    resolveRate: (userId: string, projectId: string, defaultRate: number | null) => number
  ) {
    const byProject = new Map<
      string,
      HoursAgg & { projectName: string; clientName: string | null; members: Set<string> }
    >();
    const byUser = new Map<string, HoursAgg & { userName: string; userEmail: string }>();
    const byCategory = new Map<string, HoursAgg & { categoryName: string; tasks: Set<string> }>();
    const daily = new Map<
      string,
      Map<
        string,
        HoursAgg & {
          userName: string;
          userEmail: string;
          projectName: string;
          clientName: string | null;
        }
      >
    >();

    const workspaceAgg: HoursAgg = {
      totalHours: 0,
      billableHours: 0,
      billableAmount: 0
    };

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

      this.addHours(workspaceAgg, hours, billable, amount);

      const pid = log.task.projectId;
      const pEntry = byProject.get(pid) ?? {
        projectName: log.task.project.name,
        clientName: log.task.project.clientName,
        members: new Set<string>(),
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      pEntry.members.add(log.userId);
      this.addHours(pEntry, hours, billable, amount);
      byProject.set(pid, pEntry);

      const uEntry = byUser.get(log.userId) ?? {
        userName: log.user.name,
        userEmail: log.user.email,
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      this.addHours(uEntry, hours, billable, amount);
      byUser.set(log.userId, uEntry);

      const { categoryId, categoryName } = categoryMeta(log);
      const cEntry = byCategory.get(categoryId) ?? {
        categoryName,
        tasks: new Set<string>(),
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      cEntry.tasks.add(log.taskId);
      this.addHours(cEntry, hours, billable, amount);
      byCategory.set(categoryId, cEntry);

      const dayKey = log.startTime.toISOString().slice(0, 10);
      const dayMap = daily.get(dayKey) ?? new Map();
      const rowKey = `${log.userId}:${pid}`;
      const dEntry = dayMap.get(rowKey) ?? {
        userName: log.user.name,
        userEmail: log.user.email,
        projectName: log.task.project.name,
        clientName: log.task.project.clientName,
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0
      };
      this.addHours(dEntry, hours, billable, amount);
      dayMap.set(rowKey, dEntry);
      daily.set(dayKey, dayMap);
    }

    return { workspaceAgg, byProject, byUser, byCategory, daily };
  }

  private addHours(agg: HoursAgg, hours: number, billable: boolean, amount: number) {
    agg.totalHours += hours;
    if (billable) {
      agg.billableHours += hours;
      agg.billableAmount += amount;
    }
  }
}
