import type {
  TeamMemberOverviewDto,
  TeamMembersOverviewDto,
  TeamMembersOverviewQuery
} from "@kloqra/contracts";
import { buildPaginationMeta } from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { roundExport } from "../../../common/time/round.util";
import { TimeAggregationService } from "../../../common/time/time-aggregation.service";
import { getWeekStartDate } from "../../../common/time/week.util";
// eslint-disable-next-line no-restricted-imports
import { PresenceService } from "../../presence/application/presence.service";

const ACTIVE_WITHIN_DAYS = 30;

@Injectable()
export class WorkspaceMembersOverviewService {
  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService,
    private presence: PresenceService
  ) {}

  async getOverview(
    workspaceId: string,
    query: TeamMembersOverviewQuery
  ): Promise<TeamMembersOverviewDto> {
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId }
    });
    const settings = (workspace.settings as Record<string, unknown>) ?? {};
    const weekStartPref = (settings.weekStart as "monday" | "sunday" | undefined) ?? "monday";

    const now = new Date();
    const weekStart = getWeekStartDate(now, weekStartPref);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const memberWhere: Prisma.WorkspaceMemberWhereInput = {
      workspaceId,
      ...(query.role ? { role: query.role } : {}),
      ...(query.membershipActive !== undefined ? { isActive: query.membershipActive } : {}),
      ...(query.search
        ? {
            user: {
              OR: [
                { name: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } }
              ]
            }
          }
        : {})
    };

    const [
      members,
      presence,
      weekLogs,
      projectCounts,
      lastLogs,
      totalMembers,
      adminCount,
      allMembersForSummary
    ] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: memberWhere,
        include: { user: true },
        orderBy: { createdAt: "asc" }
      }),
      this.presence.snapshot(workspaceId),
      this.aggregation.fetchLogs(workspaceId, { from: weekStart, to: weekEnd }),
      this.prisma.teamMember.groupBy({
        by: ["userId"],
        where: {
          isActive: true,
          team: { project: { workspaceId } }
        },
        _count: { _all: true }
      }),
      this.prisma.timeLog.groupBy({
        by: ["userId"],
        where: { task: { project: { workspaceId } } },
        _max: { startTime: true }
      }),
      this.prisma.workspaceMember.count({ where: { workspaceId } }),
      this.prisma.workspaceMember.count({
        where: { workspaceId, role: "ADMIN" }
      }),
      this.prisma.workspaceMember.findMany({
        where: { workspaceId },
        select: { userId: true, isActive: true }
      })
    ]);

    const { byUser } = this.aggregation.buildAggregates(weekLogs, () => 0);
    const trackingUserIds = new Set(
      presence.members.filter((m) => !m.isPaused).map((m) => m.userId)
    );
    const projectCountByUser = new Map(projectCounts.map((row) => [row.userId, row._count._all]));
    const lastActiveByUser = new Map(
      lastLogs
        .filter((row) => row._max.startTime != null)
        .map((row) => [row.userId, row._max.startTime!])
    );

    const activeThreshold = new Date(now);
    activeThreshold.setUTCDate(activeThreshold.getUTCDate() - ACTIVE_WITHIN_DAYS);

    const overviewMembers: TeamMemberOverviewDto[] = members.map((m) => {
      const weekHours = roundExport(byUser.get(m.userId)?.totalHours ?? 0);
      const lastLogAt = lastActiveByUser.get(m.userId) ?? null;
      const isTrackingNow = trackingUserIds.has(m.userId);
      const lastActiveAt = isTrackingNow
        ? now.toISOString()
        : lastLogAt
          ? lastLogAt.toISOString()
          : null;
      const activityStatus =
        isTrackingNow || (lastLogAt !== null && lastLogAt >= activeThreshold)
          ? ("active" as const)
          : ("inactive" as const);
      const status = m.isActive ? activityStatus : ("inactive" as const);

      return {
        id: m.id,
        userId: m.userId,
        userName: m.user.name,
        userEmail: m.user.email,
        role: m.role as TeamMemberOverviewDto["role"],
        pendingCredentials: m.user.mustChangePassword,
        isActive: m.isActive,
        status,
        projectCount: projectCountByUser.get(m.userId) ?? 0,
        weekHours,
        lastActiveAt,
        isTrackingNow
      };
    });

    const statusFiltered = query.status
      ? overviewMembers.filter((member) => member.status === query.status)
      : overviewMembers;

    const skip = (query.page - 1) * query.limit;
    const pagedMembers = statusFiltered.slice(skip, skip + query.limit);

    const summaryUserIds = allMembersForSummary.map((m) => m.userId);
    const membershipActiveByUser = new Map(allMembersForSummary.map((m) => [m.userId, m.isActive]));
    let activeMembers = 0;
    let totalWeekHours = 0;
    for (const userId of summaryUserIds) {
      const weekHours = roundExport(byUser.get(userId)?.totalHours ?? 0);
      totalWeekHours += weekHours;
      const lastLogAt = lastActiveByUser.get(userId) ?? null;
      const isTrackingNow = trackingUserIds.has(userId);
      const membershipActive = membershipActiveByUser.get(userId) ?? true;
      if (
        membershipActive &&
        (isTrackingNow || (lastLogAt !== null && lastLogAt >= activeThreshold))
      ) {
        activeMembers += 1;
      }
    }

    const pagination = buildPaginationMeta(statusFiltered.length, query.page, query.limit);

    return {
      members: pagedMembers,
      summary: {
        totalMembers,
        activeMembers,
        adminCount,
        totalWeekHours: roundExport(totalWeekHours)
      },
      ...pagination
    };
  }
}
