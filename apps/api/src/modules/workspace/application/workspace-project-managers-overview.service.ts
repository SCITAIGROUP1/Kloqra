import type {
  ProjectManagerOverviewDto,
  ProjectManagersOverviewDto,
  ProjectManagersOverviewQuery
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

type LeadRow = {
  id: string;
  userId: string;
  isActive: boolean;
  user: { name: string; email: string };
  team: {
    project: { id: string; name: string; isActive: boolean };
  };
};

@Injectable()
export class WorkspaceProjectManagersOverviewService {
  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService,
    private presence: PresenceService
  ) {}

  async getOverview(
    workspaceId: string,
    query: ProjectManagersOverviewQuery
  ): Promise<ProjectManagersOverviewDto> {
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

    const leadWhere: Prisma.TeamMemberWhereInput = {
      role: "PROJECT_MANAGER",
      team: {
        project: {
          workspaceId,
          ...(query.projectId ? { id: query.projectId } : {})
        }
      },
      ...(query.assignmentActive !== undefined ? { isActive: query.assignmentActive } : {}),
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

    const [leadRows, presence, weekLogs, lastLogs, workspaceMembers] = await Promise.all([
      this.prisma.teamMember.findMany({
        where: leadWhere,
        include: {
          user: { select: { name: true, email: true } },
          team: { include: { project: { select: { id: true, name: true, isActive: true } } } }
        },
        orderBy: { user: { name: "asc" } }
      }),
      this.presence.snapshot(workspaceId),
      this.aggregation.fetchLogs(workspaceId, { from: weekStart, to: weekEnd }),
      this.prisma.timeLog.groupBy({
        by: ["userId"],
        where: { task: { project: { workspaceId } } },
        _max: { startTime: true }
      }),
      this.prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: { select: { id: true } } }
      })
    ]);

    const { byUser } = this.aggregation.buildAggregates(weekLogs, () => 0);
    const trackingUserIds = new Set(
      presence.members.filter((m) => !m.isPaused).map((m) => m.userId)
    );
    const lastActiveByUser = new Map(
      lastLogs
        .filter((row) => row._max.startTime != null)
        .map((row) => [row.userId, row._max.startTime!])
    );
    const workspaceMemberByUserId = new Map(
      workspaceMembers.map((member) => [member.userId, member])
    );

    const activeThreshold = new Date(now);
    activeThreshold.setUTCDate(activeThreshold.getUTCDate() - ACTIVE_WITHIN_DAYS);

    const grouped = this.groupLeadRowsByUser(leadRows as LeadRow[]);
    const overviewManagers: ProjectManagerOverviewDto[] = [];

    for (const [userId, rows] of grouped) {
      const workspaceMember = workspaceMemberByUserId.get(userId);
      if (!workspaceMember) continue;

      if (
        query.membershipActive !== undefined &&
        workspaceMember.isActive !== query.membershipActive
      ) {
        continue;
      }

      const firstRow = rows[0]!;
      const weekHours = roundExport(byUser.get(userId)?.totalHours ?? 0);
      const lastLogAt = lastActiveByUser.get(userId) ?? null;
      const isTrackingNow = trackingUserIds.has(userId);
      const lastActiveAt = isTrackingNow
        ? now.toISOString()
        : lastLogAt
          ? lastLogAt.toISOString()
          : null;
      const activityStatus =
        isTrackingNow || (lastLogAt !== null && lastLogAt >= activeThreshold)
          ? ("active" as const)
          : ("inactive" as const);
      const status = workspaceMember.isActive ? activityStatus : ("inactive" as const);

      const managedProjects = rows.map((row) => ({
        projectId: row.team.project.id,
        projectName: row.team.project.name,
        teamMemberId: row.id,
        isActive: row.isActive,
        projectIsActive: row.team.project.isActive
      }));

      overviewManagers.push({
        workspaceMemberId: workspaceMember.id,
        userId,
        userName: firstRow.user.name,
        userEmail: firstRow.user.email,
        workspaceRole: workspaceMember.role as ProjectManagerOverviewDto["workspaceRole"],
        isWorkspaceMemberActive: workspaceMember.isActive,
        managedProjects,
        managedProjectCount: managedProjects.length,
        activeLedProjectCount: managedProjects.filter((project) => project.isActive).length,
        status,
        weekHours,
        lastActiveAt,
        isTrackingNow
      });
    }

    const statusFiltered = query.status
      ? overviewManagers.filter((manager) => manager.status === query.status)
      : overviewManagers;

    const skip = (query.page - 1) * query.limit;
    const pagedManagers = statusFiltered.slice(skip, skip + query.limit);

    const allProjectIds = new Set<string>();
    for (const manager of overviewManagers) {
      for (const project of manager.managedProjects) {
        if (project.isActive && project.projectIsActive) {
          allProjectIds.add(project.projectId);
        }
      }
    }

    let activeManagers = 0;
    for (const manager of overviewManagers) {
      if (manager.status === "active") activeManagers += 1;
    }

    const pagination = buildPaginationMeta(statusFiltered.length, query.page, query.limit);

    return {
      managers: pagedManagers,
      summary: {
        totalManagers: overviewManagers.length,
        activeManagers,
        totalLedProjects: allProjectIds.size
      },
      ...pagination
    };
  }

  private groupLeadRowsByUser(rows: LeadRow[]): Map<string, LeadRow[]> {
    const grouped = new Map<string, LeadRow[]>();
    for (const row of rows) {
      const existing = grouped.get(row.userId) ?? [];
      existing.push(row);
      grouped.set(row.userId, existing);
    }
    return grouped;
  }
}
