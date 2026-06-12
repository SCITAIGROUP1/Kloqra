import { randomBytes } from "crypto";
import type {
  AddTeamMemberDto,
  CreateProjectDto,
  CreateTeamInviteDto,
  ListProjectsQuery,
  ListProjectTeamQuery,
  UpdateProjectDto
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
import { PrismaService } from "../../../common/prisma/prisma.service";
import { NotificationsDispatchService } from "../../notifications/application/notifications-dispatch.service";

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService,
    private notificationsDispatch: NotificationsDispatchService
  ) {}

  private clientOrigin() {
    const origins = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
    return origins.split(",")[0]!.trim();
  }

  private async ensureTeam(projectId: string) {
    let team = await this.prisma.team.findUnique({ where: { projectId } });
    if (!team) {
      team = await this.prisma.team.create({ data: { projectId } });
    }
    return team;
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
        p.timesheetApprovalPeriod === "monthly"
          ? p.timesheetApprovalPeriod
          : null
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
    query: ListProjectsQuery
  ) {
    const projectIds = await this.access.accessibleProjectIds(workspaceId, userId, role);
    if (projectIds.length === 0) {
      return emptyPaginatedResponse(query.page, query.limit);
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

    const myColors =
      role === "MEMBER"
        ? await this.myColorByProjectId(
            userId,
            rows.map((p) => p.id)
          )
        : null;

    return toPaginatedResponse(
      rows.map((p) =>
        this.toDto(
          p,
          p.workspace.name,
          role === "MEMBER" ? (myColors!.get(p.id) ?? null) : undefined
        )
      ),
      total,
      query.page,
      query.limit
    );
  }

  async create(workspaceId: string, dto: CreateProjectDto) {
    const existingCount = await this.prisma.project.count({ where: { workspaceId } });
    const p = await this.prisma.project.create({
      data: {
        workspaceId,
        name: dto.name,
        color: dto.color ?? pickDefaultProjectColor(existingCount),
        clientName: dto.clientName,
        budgetHours: dto.budgetHours,
        isActive: dto.isActive ?? true,
        timesheetApprovalEnabled: dto.timesheetApprovalEnabled ?? false,
        timesheetApprovalPeriod: dto.timesheetApprovalPeriod ?? null,
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
    await this.getAdmin(workspaceId, id);
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
          : {})
      },
      include: { workspace: { select: { name: true } } }
    });
    return this.toDto(p, p.workspace.name);
  }

  private async getAdmin(workspaceId: string, id: string) {
    const p = await this.prisma.project.findFirst({ where: { id, workspaceId } });
    if (!p)
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    return p;
  }

  async remove(workspaceId: string, id: string) {
    await this.getAdmin(workspaceId, id);
    await this.prisma.project.delete({ where: { id } });
    return { ok: true };
  }

  async getTeam(workspaceId: string, projectId: string, query: ListProjectTeamQuery) {
    const project = await this.getAdmin(workspaceId, projectId);
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
      members: members.map((m) => ({
        id: m.id,
        teamId: m.teamId,
        userId: m.userId,
        userName: m.user.name,
        userEmail: m.user.email,
        isActive: m.isActive ?? true
      })),
      ...buildPaginationMeta(total, query.page, query.limit)
    };
  }

  async addTeamMember(workspaceId: string, projectId: string, dto: AddTeamMemberDto) {
    const project = await this.getAdmin(workspaceId, projectId);
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

    return {
      id: created.id,
      teamId: created.teamId,
      userId: created.userId,
      userName: created.user.name,
      userEmail: created.user.email,
      isActive: created.isActive ?? true
    };
  }

  async updateTeamMember(
    workspaceId: string,
    projectId: string,
    memberId: string,
    isActive: boolean
  ) {
    await this.getAdmin(workspaceId, projectId);
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
    const updated = await this.prisma.teamMember.update({
      where: { id: memberId },
      data: { isActive },
      include: { user: true }
    });
    return {
      id: updated.id,
      teamId: updated.teamId,
      userId: updated.userId,
      userName: updated.user.name,
      userEmail: updated.user.email,
      isActive: updated.isActive
    };
  }

  async removeTeamMember(workspaceId: string, projectId: string, memberId: string) {
    await this.getAdmin(workspaceId, projectId);
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
    await this.prisma.teamMember.delete({ where: { id: memberId } });
    return { ok: true };
  }

  async createTeamInvite(
    workspaceId: string,
    projectId: string,
    createdById: string,
    dto: CreateTeamInviteDto
  ) {
    const project = await this.getAdmin(workspaceId, projectId);
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
