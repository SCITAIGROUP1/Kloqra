import type {
  TeamActivitiesDto,
  TeamActivityMemberDto,
  TeamActivitiesQuery
} from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { roundExport } from "../../../common/time/round.util";
import { TimeAggregationService } from "../../../common/time/time-aggregation.service";
import { getWeekStartDate, getWeekStartUtc } from "../../../common/time/week.util";
function formatDateKeyInZone(date: Date, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timeZone ?? "UTC"
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function addUtcDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildDayKeys(periodStartKey: string, periodEndKey: string): string[] {
  const keys: string[] = [];
  let cursor = periodStartKey;
  while (cursor <= periodEndKey) {
    keys.push(cursor);
    cursor = addUtcDays(cursor, 1);
  }
  return keys;
}

type PeriodBounds = {
  from: Date;
  to: Date;
  periodStartKey: string;
  periodEndKey: string;
};

@Injectable()
export class WorkspaceTeamActivitiesService {
  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService
  ) {}

  async getTeamActivities(
    workspaceId: string,
    query: TeamActivitiesQuery = {}
  ): Promise<TeamActivitiesDto> {
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId }
    });
    const settings = (workspace.settings as Record<string, unknown>) ?? {};
    const weekStartPref = (settings.weekStart as "monday" | "sunday" | undefined) ?? "monday";

    const { from, to, periodStartKey, periodEndKey } = this.resolvePeriod(query, weekStartPref);
    const dayKeys = buildDayKeys(periodStartKey, periodEndKey);

    const logFilters = {
      from,
      to,
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.taskId ? { taskId: query.taskId } : {}),
      ...(query.userId ? { userId: query.userId } : {})
    };

    const [members, periodLogs] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          isActive: true,
          ...(query.userId ? { userId: query.userId } : {})
        },
        include: { user: true },
        orderBy: { createdAt: "asc" }
      }),
      this.aggregation.fetchLogs(workspaceId, logFilters)
    ]);

    const latestLogByUser = new Map<string, (typeof periodLogs)[number]>();
    for (const log of periodLogs) {
      const existing = latestLogByUser.get(log.userId);
      if (!existing || log.endTime.getTime() > existing.endTime.getTime()) {
        latestLogByUser.set(log.userId, log);
      }
    }

    const hoursByUserDay = new Map<string, Map<string, number>>();
    const periodTotalByUser = new Map<string, number>();

    for (const log of periodLogs) {
      const dayKey = formatDateKeyInZone(log.startTime, query.timezone);
      const hours = log.durationSec / 3600;
      const userDayMap = hoursByUserDay.get(log.userId) ?? new Map<string, number>();
      userDayMap.set(dayKey, (userDayMap.get(dayKey) ?? 0) + hours);
      hoursByUserDay.set(log.userId, userDayMap);
      periodTotalByUser.set(log.userId, (periodTotalByUser.get(log.userId) ?? 0) + hours);
    }

    const activityMembers: TeamActivityMemberDto[] = members.map((member) => {
      const latest = latestLogByUser.get(member.userId);
      const userDayMap = hoursByUserDay.get(member.userId);
      const periodTotalHours = roundExport(periodTotalByUser.get(member.userId) ?? 0);

      return {
        userId: member.userId,
        userName: member.user.name,
        latestActivity: latest
          ? {
              taskName: latest.task.taskName,
              projectId: latest.task.projectId,
              projectName: latest.task.project.name,
              description: latest.description,
              durationSec: latest.durationSec,
              endedAt: latest.endTime.toISOString()
            }
          : null,
        periodTotalHours,
        dailyHours: dayKeys.map((dateKey) => ({
          dateKey,
          hours: roundExport(userDayMap?.get(dateKey) ?? 0)
        }))
      };
    });

    activityMembers.sort((a, b) => {
      if (b.periodTotalHours !== a.periodTotalHours) {
        return b.periodTotalHours - a.periodTotalHours;
      }
      const aEnded = a.latestActivity?.endedAt ?? "";
      const bEnded = b.latestActivity?.endedAt ?? "";
      return bEnded.localeCompare(aEnded);
    });

    return {
      periodStart: periodStartKey,
      periodEnd: periodEndKey,
      members: activityMembers
    };
  }

  private resolvePeriod(
    query: TeamActivitiesQuery,
    weekStartPref: "monday" | "sunday"
  ): PeriodBounds {
    if (query.from && query.to) {
      const from = new Date(query.from);
      const to = new Date(query.to);
      return {
        from,
        to,
        periodStartKey: formatDateKeyInZone(from, query.timezone),
        periodEndKey: formatDateKeyInZone(to, query.timezone)
      };
    }

    const now = new Date();
    const weekStart = getWeekStartDate(now, weekStartPref);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    return {
      from: weekStart,
      to: weekEnd,
      periodStartKey: getWeekStartUtc(now, weekStartPref),
      periodEndKey: formatDateKeyInZone(weekEnd, query.timezone)
    };
  }
}
