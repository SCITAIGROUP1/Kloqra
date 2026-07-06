import { randomBytes } from "crypto";
import type {
  AddTeamMemberDto,
  CreateProjectDto,
  CreateTeamInviteDto,
  ListProjectsQuery,
  ListProjectsResponse,
  ListProjectTeamQuery,
  ProjectListItemDto,
  TeamMemberDto,
  UpdateProjectDto,
  UpdateTeamMemberDto
} from "@kloqra/contracts";
import { ErrorCodes, pickDefaultProjectColor, buildPaginationMeta } from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { ProjectAccessService } from "../../../common/access/project-access.service";
import { DomainException } from "../../../common/errors/domain.exception";
import {
  emptyPaginatedResponse,
  paginationSkipTake,
  toPaginatedResponse
} from "../../../common/http/pagination.util";
import { clientOrigin } from "../../../common/mailer/client-origin.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { waiveOpenTimesheetPeriods } from "../../../common/time/timesheet-approval-policy.util";
import { NotificationsDispatchService } from "../../notifications/application/notifications-dispatch.service";

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService,
    private notificationsDispatch: NotificationsDispatchService
  ) {}

  private clientOrigin() {
    return clientOrigin();
  }

  private async ensureTeam(projectId: string) {
    let team = await this.prisma.team.findUnique({ where: { projectId } });
    if (!team) {
      team = await this.prisma.team.create({ data: { projectId } });
    }
    return team;
  }

  toListItem(
    p: {
      id: string;
      workspaceId: string;
      name: string;
      color: string;
      clientName: string | null;
      isActive: boolean;
      timesheetApprovalEnabled: boolean;
    },
    totalTrackedSec: number,
    workspaceName?: string,
    myColor?: string | null
  ): ProjectListItemDto {
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      clientName: p.clientName,
      totalTrackedSec,
      isActive: p.isActive,
      timesheetApprovalEnabled: p.timesheetApprovalEnabled,
      ...(workspaceName ? { workspaceId: p.workspaceId, workspaceName } : {}),
      ...(myColor !== undefined ? { myColor } : {})
    };
  }

  private async totalTrackedSecByProjectId(projectIds: string[]) {
    if (projectIds.length === 0) {
      return new Map<string, number>();
    }

    const tasks = await this.prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true, projectId: true }
    });
    if (tasks.length === 0) {
      return new Map(projectIds.map((id) => [id, 0]));
    }

    const taskIdToProjectId = new Map(tasks.map((task) => [task.id, task.projectId]));
    const aggregates = await this.prisma.timeLog.groupBy({
      by: ["taskId"],
      where: { taskId: { in: tasks.map((task) => task.id) } },
      _sum: { durationSec: true }
    });

    const byProject = new Map<string, number>(projectIds.map((id) => [id, 0]));
    for (const row of aggregates) {
      const projectId = taskIdToProjectId.get(row.taskId);
      if (!projectId) continue;
      byProject.set(projectId, (byProject.get(projectId) ?? 0) + (row._sum.durationSec ?? 0));
    }

    return byProject;
  }

  toDto(
    p: {
      id: string;
      workspaceId: string;
      name: string;
      color: string;
      clientName: string | null;
      budgetHours: { toNumber(): number } | null;
      isActive: boolean;
      timesheetApprovalEnabled: boolean;
      timesheetApprovalPeriod: string | null;
      timesheetApprovalEnabledAt?: Date | null;
      createdAt?: Date;
    },
    workspaceName?: string,
    myColor?: string | null
  ) {
    return {
      id: p.id,
      workspaceId: p.workspaceId,
      workspaceName,
      name: p.name,
      color: p.color,
      ...(myColor !== undefined ? { myColor } : {}),
      clientName: p.clientName,
      budgetHours: p.budgetHours?.toNumber() ?? null,
      isActive: p.isActive,
      timesheetApprovalEnabled: p.timesheetApprovalEnabled,
      timesheetApprovalPeriod:
        p.timesheetApprovalPeriod === "daily" ||
        p.timesheetApprovalPeriod === "weekly" ||
        p.timesheetApprovalPeriod === "monthly" ||
        p.timesheetApprovalPeriod === "custom"
          ? p.timesheetApprovalPeriod
          : null,
      timesheetApprovalEnabledAt: p.timesheetApprovalEnabledAt
        ? p.timesheetApprovalEnabledAt.toISOString()
        : null,
      createdAt: p.createdAt ? p.createdAt.toISOString() : undefined
    };
  }

  private async myColorByProjectId(userId: string, projectIds: string[]) {
    if (projectIds.length === 0) return new Map<string, string>();
    const rows = await this.prisma.userProjectColor.findMany({
      where: { userId, projectId: { in: projectIds } },
      select: { projectId: true, color: true }
    });
    return new Map(rows.map((r) => [r.projectId, r.color]));
  }

  async list(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    query: ListProjectsQuery,
    options?: { adminScope?: boolean; managedProjectIds?: string[] }
  ): Promise<ListProjectsResponse> {
    const projectIds =
      role === "ADMIN"
        ? await this.access.manageableProjectIds(workspaceId, userId, role)
        : options?.adminScope && options.managedProjectIds && options.managedProjectIds.length > 0
          ? options.managedProjectIds
          : await this.access.accessibleProjectIds(workspaceId, userId, role);
    if (projectIds.length === 0) {
      return emptyPaginatedResponse<ProjectListItemDto>(query.page, query.limit);
    }

    const where = {
      id: { in: projectIds },
      workspaceId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { clientName: { contains: query.search, mode: "insensitive" as const } }
            ]
          }
        : {})
    };

    const [total, rows] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        include: { workspace: { select: { name: true } } },
        orderBy: { name: "asc" },
        ...paginationSkipTake(query.page, query.limit)
      })
    ]);

    const projectIdsOnPage = rows.map((p) => p.id);
    const [myColors, trackedByProject] = await Promise.all([
      role === "MEMBER" ? this.myColorByProjectId(userId, projectIdsOnPage) : Promise.resolve(null),
      this.totalTrackedSecByProjectId(projectIdsOnPage)
    ]);

    return toPaginatedResponse(
      rows.map((p) =>
        this.toListItem(
          p,
          trackedByProject.get(p.id) ?? 0,
          role === "MEMBER" ? p.workspace.name : undefined,
          role === "MEMBER" ? (myColors!.get(p.id) ?? null) : undefined
        )
      ),
      total,
      query.page,
      query.limit
    );
  }

  async create(workspaceId: string, dto: CreateProjectDto) {
    await this.assertNameAvailable(workspaceId, dto.name);
    const existingCount = await this.prisma.project.count({ where: { workspaceId } });
    const approvalEnabled = dto.timesheetApprovalEnabled ?? false;
    const p = await this.prisma.project.create({
      data: {
        workspaceId,
        name: dto.name,
        color: dto.color ?? pickDefaultProjectColor(existingCount),
        clientName: dto.clientName,
        budgetHours: dto.budgetHours,
        isActive: dto.isActive ?? true,
        timesheetApprovalEnabled: approvalEnabled,
        timesheetApprovalPeriod: dto.timesheetApprovalPeriod ?? null,
        timesheetApprovalEnabledAt: approvalEnabled ? new Date() : null,
        timesheetApprovalPeriodEffectiveAt: approvalEnabled ? new Date() : null,
        team: { create: {} }
      },
      include: { workspace: { select: { name: true } } }
    });
    return this.toDto(p, p.workspace.name);
  }

  async get(workspaceId: string, userId: string, role: "ADMIN" | "MEMBER", id: string) {
    await this.access.assertCanAccessProject(workspaceId, userId, role, id);
    const p = await this.prisma.project.findFirst({
      where: { id, workspaceId },
      include: { workspace: { select: { name: true } } }
    });
    if (!p)
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    const myColor =
      role === "MEMBER"
        ? ((await this.myColorByProjectId(userId, [id])).get(id) ?? null)
        : undefined;
    return this.toDto(p, p.workspace.name, myColor);
  }

  async update(workspaceId: string, id: string, dto: UpdateProjectDto) {
    const before = await this.getAdmin(workspaceId, id);
    if (dto.name && dto.name !== before.name) {
      await this.assertNameAvailable(workspaceId, dto.name, id);
    }

    const approvalEnabling =
      dto.timesheetApprovalEnabled === true && !before.timesheetApprovalEnabled;
    const approvalDisabling =
      dto.timesheetApprovalEnabled === false && before.timesheetApprovalEnabled;
    const periodChanging =
      dto.timesheetApprovalPeriod !== undefined &&
      dto.timesheetApprovalPeriod !== before.timesheetApprovalPeriod &&
      (before.timesheetApprovalEnabled || dto.timesheetApprovalEnabled === true);

    const now = new Date();
    const p = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        color: dto.color,
        clientName: dto.clientName,
        budgetHours: dto.budgetHours,
        isActive: dto.isActive,
        ...(dto.timesheetApprovalEnabled !== undefined
          ? { timesheetApprovalEnabled: dto.timesheetApprovalEnabled }
          : {}),
        ...(dto.timesheetApprovalPeriod !== undefined
          ? { timesheetApprovalPeriod: dto.timesheetApprovalPeriod }
          : {}),
        ...(approvalEnabling
          ? {
              timesheetApprovalEnabledAt: now,
              timesheetApprovalPeriodEffectiveAt: now
            }
          : {}),
        ...(approvalDisabling
          ? {
              timesheetApprovalEnabledAt: null,
              timesheetApprovalPeriodEffectiveAt: null
            }
          : {}),
        ...(periodChanging && !approvalEnabling ? { timesheetApprovalPeriodEffectiveAt: now } : {})
      },
      include: { workspace: { select: { name: true } } }
    });

    if (approvalDisabling || approvalEnabling || periodChanging) {
      await waiveOpenTimesheetPeriods(this.prisma, id);
    }

    if (approvalEnabling) {
      void this.notifyApprovalSettingsChanged(
        workspaceId,
        id,
        p.name,
        "enabled",
        p.timesheetApprovalPeriod
      ).catch(() => undefined);
    } else if (approvalDisabling) {
      void this.notifyApprovalSettingsChanged(workspaceId, id, p.name, "disabled").catch(
        () => undefined
      );
    } else if (periodChanging) {
      void this.notifyApprovalSettingsChanged(
        workspaceId,
        id,
        p.name,
        "period",
        p.timesheetApprovalPeriod
      ).catch(() => undefined);
    }

    if (dto.isActive === false && before.isActive) {
      void this.notifyProjectDeactivated(workspaceId, id, p.name).catch(() => undefined);
    }

    return this.toDto(p, p.workspace.name);
  }

  private async notifyProjectDeactivated(
    workspaceId: string,
    projectId: string,
    projectName: string
  ) {
    const members = await this.prisma.teamMember.findMany({
      where: { isActive: true, team: { projectId } },
      select: { userId: true }
    });
    for (const member of members) {
      await this.notificationsDispatch.notify({
        userId: member.userId,
        workspaceId,
        templateId: "project.deactivated",
        context: { projectName, projectId }
      });
    }
  }

  private approvalPeriodLabel(period: string | null): string {
    if (period === "daily") return "daily";
    if (period === "weekly") return "weekly";
    if (period === "monthly") return "monthly";
    if (period === "custom") return "custom";
    return "default";
  }

  private async notifyApprovalSettingsChanged(
    workspaceId: string,
    projectId: string,
    projectName: string,
    kind: "enabled" | "disabled" | "period",
    period: string | null = null
  ) {
    const members = await this.prisma.teamMember.findMany({
      where: { isActive: true, team: { projectId } },
      select: { userId: true }
    });

    let changeSummary: string;
    if (kind === "enabled") {
      changeSummary = `Timesheet approval enabled (${this.approvalPeriodLabel(period)})`;
    } else if (kind === "disabled") {
      changeSummary = "Timesheet approval disabled";
    } else {
      changeSummary = `Approval period changed to ${this.approvalPeriodLabel(period)}`;
    }

    for (const member of members) {
      await this.notificationsDispatch.notify({
        userId: member.userId,
        workspaceId,
        templateId: "project.approvalSettingsChanged",
        context: { projectName, projectId, changeSummary }
      });
    }
  }

  private notifyProjectUnassigned(
    workspaceId: string,
    userId: string,
    projectId: string,
    projectName: string
  ) {
    void this.notificationsDispatch
      .notify({
        userId,
        workspaceId,
        templateId: "project.unassigned",
        context: { projectName, projectId }
      })
      .catch(() => undefined);
  }

  private mapTeamMemberRow(member: {
    id: string;
    teamId: string;
    userId: string;
    role: string;
    isActive: boolean;
    user: { name: string; email: string };
  }): TeamMemberDto {
    return {
      id: member.id,
      teamId: member.teamId,
      userId: member.userId,
      userName: member.user.name,
      userEmail: member.user.email,
      role: member.role as TeamMemberDto["role"],
      isActive: member.isActive ?? true
    };
  }

  private async requireManageProject(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    projectId: string
  ) {
    await this.access.assertCanManageProject(workspaceId, userId, role, projectId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId }
    });
    if (!project) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    }
    return project;
  }

  private async getAdmin(workspaceId: string, id: string) {
    const p = await this.prisma.project.findFirst({ where: { id, workspaceId } });
    if (!p)
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    return p;
  }

  private async assertNameAvailable(workspaceId: string, name: string, excludeProjectId?: string) {
    const existing = await this.prisma.project.findFirst({
      where: {
        workspaceId,
        name,
        ...(excludeProjectId ? { id: { not: excludeProjectId } } : {})
      }
    });
    if (existing) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Validation failed — Name is already taken in this workspace",
        HttpStatus.CONFLICT
      );
    }
  }

  async remove(workspaceId: string, id: string) {
    const project = await this.getAdmin(workspaceId, id);
    if (project.name === "Uncategorized") {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Cannot delete the default Uncategorized project.",
        HttpStatus.BAD_REQUEST
      );
    }

    // Find or create default Uncategorized project
    let uncategorized = await this.prisma.project.findFirst({
      where: { workspaceId, name: "Uncategorized" }
    });
    if (!uncategorized) {
      uncategorized = await this.prisma.project.create({
        data: {
          workspaceId,
          name: "Uncategorized",
          color: "#9ca3af"
        }
      });
      await this.ensureTeam(uncategorized.id);
    }

    // Find or create default Uncategorized category
    let uncategorizedCategory = await this.prisma.category.findFirst({
      where: { workspaceId, name: "Uncategorized" }
    });
    if (!uncategorizedCategory) {
      uncategorizedCategory = await this.prisma.category.create({
        data: {
          workspaceId,
          name: "Uncategorized",
          description: "System default category for uncategorized tasks."
        }
      });
    }

    // Find or create Uncategorized Task in Uncategorized project
    let uncategorizedTask = await this.prisma.task.findFirst({
      where: { projectId: uncategorized.id, taskName: "Uncategorized Task" }
    });
    if (!uncategorizedTask) {
      uncategorizedTask = await this.prisma.task.create({
        data: {
          projectId: uncategorized.id,
          categoryId: uncategorizedCategory.id,
          taskName: "Uncategorized Task",
          billableDefault: true
        }
      });
    }

    // Get all task IDs belonging to the project being deleted
    const tasksOfProject = await this.prisma.task.findMany({
      where: { projectId: id },
      select: { id: true }
    });
    const taskIds = tasksOfProject.map((t) => t.id);

    // Update all TimeLogs to point to the Uncategorized Task under Uncategorized project
    if (taskIds.length > 0) {
      await this.prisma.timeLog.updateMany({
        where: { taskId: { in: taskIds } },
        data: { taskId: uncategorizedTask.id }
      });
    }

    await this.prisma.project.delete({ where: { id } });
    return { ok: true };
  }

  async getTeam(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    projectId: string,
    query: ListProjectTeamQuery
  ) {
    const project = await this.requireManageProject(workspaceId, userId, role, projectId);
    const team = await this.ensureTeam(projectId);

    const memberWhere = {
      teamId: team.id,
      ...(query.search
        ? {
            user: {
              OR: [
                { name: { contains: query.search, mode: "insensitive" as const } },
                { email: { contains: query.search, mode: "insensitive" as const } }
              ]
            }
          }
        : {})
    };

    const [total, members] = await Promise.all([
      this.prisma.teamMember.count({ where: memberWhere }),
      this.prisma.teamMember.findMany({
        where: memberWhere,
        include: { user: true },
        orderBy: { createdAt: "asc" },
        ...paginationSkipTake(query.page, query.limit)
      })
    ]);

    return {
      id: team.id,
      projectId: project.id,
      projectName: project.name,
      members: members.map((m) => this.mapTeamMemberRow(m)),
      ...buildPaginationMeta(total, query.page, query.limit)
    };
  }

  /** Read-only roster for regular members — accessible by any user assigned to this project. */
  async getMemberTeamRoster(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    projectId: string,
    query: ListProjectTeamQuery
  ) {
    await this.access.assertCanAccessProject(workspaceId, userId, role, projectId);
    const team = await this.ensureTeam(projectId);

    const memberWhere = {
      teamId: team.id,
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            user: {
              OR: [
                { name: { contains: query.search, mode: "insensitive" as const } },
                { email: { contains: query.search, mode: "insensitive" as const } }
              ]
            }
          }
        : {})
    };

    const [total, rows] = await Promise.all([
      this.prisma.teamMember.count({ where: memberWhere }),
      this.prisma.teamMember.findMany({
        where: memberWhere,
        include: { user: true },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        ...paginationSkipTake(query.page, query.limit)
      })
    ]);

    const { page, limit, totalPages } = buildPaginationMeta(total, query.page, query.limit);
    return {
      items: rows.map((m) => this.mapTeamMemberRow(m)),
      page,
      limit,
      total,
      totalPages
    };
  }

  async addTeamMember(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    projectId: string,
    dto: AddTeamMemberDto
  ) {
    const project = await this.requireManageProject(workspaceId, userId, role, projectId);
    const workspaceMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: dto.userId } }
    });
    if (!workspaceMember) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "User is not a member of this workspace",
        HttpStatus.FORBIDDEN
      );
    }

    const team = await this.ensureTeam(projectId);
    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: dto.userId } }
    });
    if (existing) {
      throw new DomainException(
        ErrorCodes.MEMBER_ALREADY_EXISTS,
        "Already on this project team",
        HttpStatus.CONFLICT
      );
    }

    const created = await this.prisma.teamMember.create({
      data: { teamId: team.id, userId: dto.userId },
      include: { user: true }
    });

    void this.notificationsDispatch
      .notify({
        userId: dto.userId,
        workspaceId,
        templateId: "project.assigned",
        context: { projectName: project.name, projectId }
      })
      .catch(() => undefined);

    return this.mapTeamMemberRow(created);
  }

  async updateTeamMember(
    workspaceId: string,
    projectId: string,
    memberId: string,
    dto: UpdateTeamMemberDto,
    actorRole: "ADMIN" | "MEMBER",
    actorUserId: string
  ) {
    await this.access.assertCanManageProject(workspaceId, actorUserId, actorRole, projectId);
    if (dto.role !== undefined && actorRole !== "ADMIN") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Only workspace admins can change project manager roles",
        HttpStatus.FORBIDDEN
      );
    }
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId }
    });
    if (!project) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    }
    const team = await this.ensureTeam(projectId);
    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId: team.id }
    });
    if (!member) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Team member not found",
        HttpStatus.NOT_FOUND
      );
    }
    if (
      dto.role === "MEMBER" &&
      member.role === "PROJECT_MANAGER" &&
      actorRole !== "ADMIN" &&
      member.userId !== actorUserId
    ) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Project managers cannot demote other project managers",
        HttpStatus.FORBIDDEN
      );
    }

    if (dto.isActive === true) {
      const workspaceMember = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: member.userId } }
      });
      if (!workspaceMember || !workspaceMember.isActive) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "User must be an active workspace member before they can be activated on a project",
          HttpStatus.FORBIDDEN
        );
      }
    }

    const updated = await this.prisma.teamMember.update({
      where: { id: memberId },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.role !== undefined && actorRole === "ADMIN" ? { role: dto.role } : {})
      },
      include: { user: true }
    });

    if (dto.isActive === false && member.isActive !== false) {
      this.notifyProjectUnassigned(workspaceId, updated.userId, projectId, project.name);
    }

    return this.mapTeamMemberRow(updated);
  }

  async removeTeamMember(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    projectId: string,
    memberId: string
  ) {
    const project = await this.requireManageProject(workspaceId, userId, role, projectId);
    const team = await this.ensureTeam(projectId);
    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId: team.id }
    });
    if (!member) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Team member not found",
        HttpStatus.NOT_FOUND
      );
    }

    this.notifyProjectUnassigned(workspaceId, member.userId, projectId, project.name);
    await this.prisma.teamMember.delete({ where: { id: memberId } });
    return { ok: true };
  }

  async createTeamInvite(
    workspaceId: string,
    projectId: string,
    createdById: string,
    dto: CreateTeamInviteDto,
    actorRole: "ADMIN" | "MEMBER"
  ) {
    const project = await this.requireManageProject(workspaceId, createdById, actorRole, projectId);
    await this.ensureTeam(projectId);
    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.projectInvite.create({
      data: {
        projectId,
        token,
        email: dto.email ?? null,
        expiresAt,
        createdById
      }
    });

    const inviteUrl = `${this.clientOrigin()}/invite/${token}`;
    return {
      id: invite.id,
      projectId,
      projectName: project.name,
      token,
      email: invite.email,
      inviteUrl,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: null
    };
  }

  async previewInvite(token: string) {
    const invite = await this.prisma.projectInvite.findUnique({
      where: { token },
      include: { project: { include: { workspace: true } } }
    });
    if (!invite) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Invite not found", HttpStatus.NOT_FOUND);
    }
    const expired = invite.expiresAt < new Date() || !!invite.acceptedAt;
    return {
      projectName: invite.project.name,
      workspaceName: invite.project.workspace.name,
      email: invite.email,
      expiresAt: invite.expiresAt.toISOString(),
      expired
    };
  }

  async acceptInviteForUser(token: string, userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.acceptInvite(token, userId, user.email);
  }

  async acceptInvite(token: string, userId: string, userEmail: string) {
    const invite = await this.prisma.projectInvite.findUnique({
      where: { token },
      include: { project: true }
    });
    if (!invite) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Invite not found", HttpStatus.NOT_FOUND);
    }
    if (invite.acceptedAt) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Invite already used",
        HttpStatus.CONFLICT
      );
    }
    if (invite.expiresAt < new Date()) {
      throw new DomainException(ErrorCodes.VALIDATION_ERROR, "Invite expired", HttpStatus.GONE);
    }
    if (invite.email && invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "This invite was sent to a different email address",
        HttpStatus.FORBIDDEN
      );
    }

    const workspaceMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.project.workspaceId,
          userId
        }
      }
    });
    if (!workspaceMember) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Join the workspace before accepting a team invite",
        HttpStatus.FORBIDDEN
      );
    }

    const team = await this.ensureTeam(invite.projectId);

    await this.prisma.$transaction([
      this.prisma.teamMember.upsert({
        where: {
          teamId_userId: { teamId: team.id, userId }
        },
        create: { teamId: team.id, userId },
        update: {}
      }),
      this.prisma.projectInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() }
      })
    ]);

    void this.notificationsDispatch
      .notify({
        userId,
        workspaceId: invite.project.workspaceId,
        templateId: "project.assigned",
        context: {
          projectName: invite.project.name,
          projectId: invite.projectId
        }
      })
      .catch(() => undefined);

    return {
      projectId: invite.projectId,
      projectName: invite.project.name
    };
  }
}
