import type {
  WorkspaceAdminOverviewDto,
  WorkspaceAdminsOverviewDto,
  WorkspaceAdminsOverviewQuery
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
export class TenantWorkspaceAdminsOverviewService {
  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService,
    private presence: PresenceService
  ) {}

  async getOverview(
    tenantId: string,
    query: WorkspaceAdminsOverviewQuery
  ): Promise<WorkspaceAdminsOverviewDto> {
    const now = new Date();
    const weekStart = getWeekStartDate(now, "monday");
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const memberWhere: Prisma.WorkspaceMemberWhereInput = {
      role: "ADMIN",
      workspace: { tenantId },
      ...(query.workspaceIds && query.workspaceIds.length > 0
        ? { workspaceId: { in: query.workspaceIds } }
        : {}),
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

    const adminMembers = await this.prisma.workspaceMember.findMany({
      where: memberWhere,
      include: {
        user: { select: { name: true, email: true, mustChangePassword: true } },
        workspace: { select: { id: true, name: true, settings: true } }
      },
      orderBy: [{ workspace: { name: "asc" } }, { user: { name: "asc" } }]
    });

    const workspaceIds = [...new Set(adminMembers.map((member) => member.workspaceId))];
    const [weekLogsByWorkspace, presenceByWorkspace, lastLogs] = await Promise.all([
      Promise.all(
        workspaceIds.map(async (workspaceId) => ({
          workspaceId,
          logs: await this.aggregation.fetchLogs(workspaceId, { from: weekStart, to: weekEnd })
        }))
      ),
      Promise.all(
        workspaceIds.map(async (workspaceId) => ({
          workspaceId,
          snapshot: await this.presence.snapshot(workspaceId)
        }))
      ),
      this.prisma.timeLog.groupBy({
        by: ["userId"],
        where: { task: { project: { workspace: { tenantId } } } },
        _max: { startTime: true }
      })
    ]);

    const weekHoursByUser = new Map<string, number>();
    for (const { logs } of weekLogsByWorkspace) {
      const { byUser } = this.aggregation.buildAggregates(logs, () => 0);
      for (const [userId, aggregate] of byUser) {
        weekHoursByUser.set(
          userId,
          roundExport((weekHoursByUser.get(userId) ?? 0) + aggregate.totalHours)
        );
      }
    }

    const trackingUserIds = new Set<string>();
    for (const { snapshot } of presenceByWorkspace) {
      for (const member of snapshot.members) {
        if (!member.isPaused) trackingUserIds.add(member.userId);
      }
    }

    const lastActiveByUser = new Map(
      lastLogs
        .filter((row) => row._max.startTime != null)
        .map((row) => [row.userId, row._max.startTime!])
    );

    const activeThreshold = new Date(now);
    activeThreshold.setUTCDate(activeThreshold.getUTCDate() - ACTIVE_WITHIN_DAYS);

    const overviewAdmins: WorkspaceAdminOverviewDto[] = adminMembers.map((member) => {
      const weekHours = weekHoursByUser.get(member.userId) ?? 0;
      const lastLogAt = lastActiveByUser.get(member.userId) ?? null;
      const isTrackingNow = trackingUserIds.has(member.userId);
      const lastActiveAt = isTrackingNow
        ? now.toISOString()
        : lastLogAt
          ? lastLogAt.toISOString()
          : null;
      const activityStatus =
        isTrackingNow || (lastLogAt !== null && lastLogAt >= activeThreshold)
          ? ("active" as const)
          : ("inactive" as const);
      const status = member.isActive ? activityStatus : ("inactive" as const);

      return {
        workspaceMemberId: member.id,
        userId: member.userId,
        userName: member.user.name,
        userEmail: member.user.email,
        workspaceId: member.workspaceId,
        workspaceName: member.workspace.name,
        isActive: member.isActive,
        pendingCredentials: member.user.mustChangePassword,
        status,
        weekHours,
        lastActiveAt,
        isTrackingNow
      };
    });

    const statusFiltered = query.status
      ? overviewAdmins.filter((admin) => admin.status === query.status)
      : overviewAdmins;

    const skip = (query.page - 1) * query.limit;
    const pagedAdmins = statusFiltered.slice(skip, skip + query.limit);

    const workspacesWithAdmins = new Set(
      overviewAdmins.filter((admin) => admin.isActive).map((admin) => admin.workspaceId)
    );

    let activeAdmins = 0;
    for (const admin of overviewAdmins) {
      if (admin.status === "active") activeAdmins += 1;
    }

    const pagination = buildPaginationMeta(statusFiltered.length, query.page, query.limit);

    return {
      admins: pagedAdmins,
      summary: {
        totalAdmins: overviewAdmins.length,
        activeAdmins,
        workspacesWithAdmins: workspacesWithAdmins.size
      },
      ...pagination
    };
  }
}
