import { ErrorCodes } from "@kloqra/contracts";
import type {
  InviteMemberDto,
  InviteMemberResponseDto,
  MemberEmailDeliveryDto,
  UpdateWorkspaceMemberDto,
  WorkspaceDto,
  WorkspaceListItemDto,
  WorkspaceMemberPickerDto,
  WorkspaceWithRoleDto
} from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { generateTempPassword, hashPassword } from "../../../common/auth/password.util";
import { DomainException } from "../../../common/errors/domain.exception";
import { deliverMemberEmail } from "../../../common/mailer/member-email-delivery.util";
import { MemberProvisioningMailer } from "../../../common/mailer/member-provisioning.mailer";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  activeWorkspaceMemberWhere,
  toWorkspaceMemberWithUser,
  type WorkspaceMemberWithUser
} from "../../../common/workspace/workspace-member.types";
// eslint-disable-next-line no-restricted-imports
import { AuthService } from "../../auth/application/auth.service";
import { NotificationsDispatchService } from "../../notifications/application/notifications-dispatch.service";
import { splitDisplayName } from "../../users/application/user-name.util";

@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private memberMailer: MemberProvisioningMailer,
    private notificationsDispatch: NotificationsDispatchService,
    private auth: AuthService
  ) {}

  async listForUser(userId: string): Promise<WorkspaceListItemDto[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true }
    });
    return memberships.map((m) => this.toListItem(m.workspace, m.role as "ADMIN" | "MEMBER"));
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMemberPickerDto[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true }
    });
    return members.map((m) => this.toMemberPickerDto(m));
  }

  async updateMember(
    workspaceId: string,
    memberId: string,
    dto: UpdateWorkspaceMemberDto,
    actingUserId: string
  ) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      // Acquire write-lock on the workspace row to prevent concurrent role changes/removals
      await tx.$queryRaw`SELECT 1 FROM workspaces WHERE id = ${workspaceId} FOR UPDATE`;

      const foundMember = await tx.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
        include: { user: true }
      });
      if (!foundMember) {
        throw new DomainException(
          ErrorCodes.NOT_FOUND,
          "Workspace member not found",
          HttpStatus.NOT_FOUND
        );
      }
      const member = toWorkspaceMemberWithUser(foundMember);

      const nextRole = dto.role ?? (member.role as "ADMIN" | "MEMBER");
      const nextIsActive = dto.isActive ?? member.isActive;

      if (dto.isActive === false && member.userId === actingUserId) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "Cannot deactivate yourself",
          HttpStatus.FORBIDDEN
        );
      }

      if (nextRole === member.role && nextIsActive === member.isActive) {
        return { kind: "unchanged" as const, member: this.toMemberDto(member) };
      }

      if (member.role === "ADMIN" && nextRole === "MEMBER") {
        const adminCount = await tx.workspaceMember.count({
          where: activeWorkspaceMemberWhere({ workspaceId, role: "ADMIN" })
        });
        if (adminCount <= 1) {
          throw new DomainException(
            ErrorCodes.FORBIDDEN,
            "Cannot demote the last workspace admin",
            HttpStatus.FORBIDDEN
          );
        }
      }

      if (member.role === "ADMIN" && nextIsActive === false) {
        const activeAdminCount = await tx.workspaceMember.count({
          where: activeWorkspaceMemberWhere({ workspaceId, role: "ADMIN" })
        });
        if (activeAdminCount <= 1) {
          throw new DomainException(
            ErrorCodes.FORBIDDEN,
            "Cannot deactivate the last workspace admin",
            HttpStatus.FORBIDDEN
          );
        }
      }

      const updated = toWorkspaceMemberWithUser(
        await tx.workspaceMember.update({
          where: { id: memberId },
          data: {
            ...(dto.role !== undefined ? { role: dto.role } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
          },
          include: { user: true }
        })
      );

      if (dto.isActive === false && member.isActive) {
        await tx.teamMember.updateMany({
          where: {
            userId: member.userId,
            team: {
              project: {
                workspaceId
              }
            }
          },
          data: {
            isActive: false
          }
        });
      }

      const roleChanged = dto.role !== undefined && dto.role !== member.role;
      const statusChanged = dto.isActive !== undefined && dto.isActive !== member.isActive;

      return {
        kind: roleChanged ? ("roleChanged" as const) : ("statusChanged" as const),
        member: this.toMemberDto(updated),
        newRole: roleChanged ? dto.role! : undefined,
        statusChanged
      };
    });

    if (outcome.kind === "roleChanged" && outcome.newRole) {
      const [workspace, actor] = await Promise.all([
        this.prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { name: true }
        }),
        this.prisma.user.findUnique({
          where: { id: actingUserId },
          select: { name: true }
        })
      ]);
      const workspaceName = workspace?.name ?? "the workspace";
      const actorName = actor?.name;

      void this.notificationsDispatch
        .notify({
          userId: outcome.member.userId,
          workspaceId,
          templateId: "member.roleChanged",
          context: {
            workspaceName,
            newRole: outcome.newRole,
            actorName
          }
        })
        .catch(() => undefined);

      void this.notificationsDispatch
        .notifyWorkspaceAdmins(workspaceId, {
          templateId: "member.roleUpdated",
          context: {
            memberName: outcome.member.userName,
            workspaceName,
            newRole: outcome.newRole,
            actorName
          }
        })
        .catch(() => undefined);
    }

    return outcome.member;
  }

  async removeMember(workspaceId: string, memberId: string, actingUserId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Acquire write-lock on the workspace row to prevent concurrent role changes/removals
      await tx.$queryRaw`SELECT 1 FROM workspaces WHERE id = ${workspaceId} FOR UPDATE`;

      const member = await tx.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
        include: { user: true }
      });
      if (!member) {
        throw new DomainException(
          ErrorCodes.NOT_FOUND,
          "Workspace member not found",
          HttpStatus.NOT_FOUND
        );
      }

      if (member.userId === actingUserId) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "Cannot remove yourself from the workspace",
          HttpStatus.FORBIDDEN
        );
      }

      if (member.role === "ADMIN") {
        const adminCount = await tx.workspaceMember.count({
          where: { workspaceId, role: "ADMIN" }
        });
        if (adminCount <= 1) {
          throw new DomainException(
            ErrorCodes.FORBIDDEN,
            "Cannot remove the last workspace admin",
            HttpStatus.FORBIDDEN
          );
        }
      }

      const workspace = await tx.workspace.findUnique({ where: { id: workspaceId } });

      // Deactivate TeamMember rows for the removed member in this workspace
      await tx.teamMember.updateMany({
        where: {
          userId: member.userId,
          team: {
            project: {
              workspaceId
            }
          }
        },
        data: {
          isActive: false
        }
      });

      await tx.workspaceMember.delete({ where: { id: memberId } });

      return { member, workspace };
    });

    const { member, workspace } = result;

    const actor = await this.prisma.user.findUnique({
      where: { id: actingUserId },
      select: { name: true }
    });
    void this.notificationsDispatch
      .notifyWorkspaceAdmins(workspaceId, {
        templateId: "member.removed",
        context: {
          memberName: member.user.name,
          workspaceName: workspace?.name ?? "the workspace",
          actorName: actor?.name
        }
      })
      .catch(() => undefined);

    void this.notificationsDispatch
      .notify({
        userId: member.userId,
        workspaceId,
        templateId: "workspace.removed",
        context: {
          workspaceName: workspace?.name ?? "the workspace",
          actorName: actor?.name
        }
      })
      .catch(() => undefined);

    return { ok: true as const };
  }

  async invite(
    workspaceId: string,
    dto: InviteMemberDto,
    invitedByUserId: string
  ): Promise<InviteMemberResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Workspace not found", HttpStatus.NOT_FOUND);
    }

    const inviter = await this.prisma.user.findUnique({ where: { id: invitedByUserId } });
    const inviterName = inviter?.name;

    let user = await this.prisma.user.findUnique({ where: { email } });
    let userCreated = false;
    let temporaryPassword: string | undefined;

    if (!user) {
      const displayName = dto.name.trim();
      const { firstName, lastName } = splitDisplayName(displayName);
      temporaryPassword = generateTempPassword();
      const passwordHash = await hashPassword(temporaryPassword);
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name: displayName,
          firstName,
          lastName,
          mustChangePassword: true,
          emailVerifiedAt: null
        }
      });
      userCreated = true;
    }

    const existing = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } }
    });
    if (existing) {
      throw new DomainException(
        ErrorCodes.MEMBER_ALREADY_EXISTS,
        "Already a member of this workspace",
        HttpStatus.CONFLICT
      );
    }

    const membership = await this.prisma.workspaceMember.create({
      data: { workspaceId, userId: user.id, role: dto.role },
      include: { user: true }
    });

    const emailDelivery = await deliverMemberEmail(this.memberMailer.isConfigured, () =>
      userCreated && temporaryPassword
        ? this.memberMailer.sendNewMemberCredentials({
            to: email,
            workspaceName: workspace.name,
            inviterName,
            temporaryPassword
          })
        : this.memberMailer.sendWorkspaceAdded({
            to: email,
            workspaceName: workspace.name,
            inviterName
          })
    );

    void this.notificationsDispatch
      .notifyWorkspaceAdmins(workspaceId, {
        templateId: "member.joined",
        context: {
          memberName: membership.user.name,
          workspaceName: workspace.name,
          inviterName: inviterName
        }
      })
      .catch(() => undefined);

    void this.notificationsDispatch
      .notify({
        userId: user.id,
        workspaceId,
        templateId: "workspace.added",
        context: {
          workspaceName: workspace.name,
          inviterName
        }
      })
      .catch(() => undefined);

    if (userCreated) {
      void this.auth.sendEmailVerification(user.id).catch(() => undefined);
    }

    return {
      member: this.toMemberDto(toWorkspaceMemberWithUser(membership)),
      userCreated,
      emailSent: emailDelivery.emailSent,
      ...(emailDelivery.emailSkipReason ? { emailSkipReason: emailDelivery.emailSkipReason } : {}),
      ...(emailDelivery.emailFailureMessage
        ? { emailFailureMessage: emailDelivery.emailFailureMessage }
        : {})
    };
  }

  async resendMemberCredentials(
    workspaceId: string,
    memberId: string
  ): Promise<MemberEmailDeliveryDto> {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      include: { user: true }
    });
    if (!member) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Workspace member not found",
        HttpStatus.NOT_FOUND
      );
    }
    if (!member.user.mustChangePassword) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "This member has already set their password",
        HttpStatus.FORBIDDEN
      );
    }

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Workspace not found", HttpStatus.NOT_FOUND);
    }

    const temporaryPassword = generateTempPassword();
    await this.prisma.user.update({
      where: { id: member.userId },
      data: {
        passwordHash: await hashPassword(temporaryPassword),
        mustChangePassword: true
      }
    });

    return deliverMemberEmail(this.memberMailer.isConfigured, () =>
      this.memberMailer.sendNewMemberCredentials({
        to: member.user.email,
        workspaceName: workspace.name,
        temporaryPassword
      })
    );
  }

  async getById(id: string) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({ where: { id } });
    return this.toWorkspaceDto(ws);
  }

  async update(id: string, dto: { name?: string; settings?: any }) {
    const data: any = {};
    if (dto.name !== undefined) {
      await this.assertNameAvailable(dto.name, id);
      data.name = dto.name;
    }
    if (dto.settings !== undefined) {
      const ws = await this.prisma.workspace.findUnique({ where: { id } });
      if (!ws) {
        throw new DomainException(
          ErrorCodes.NOT_FOUND,
          "Workspace not found",
          HttpStatus.NOT_FOUND
        );
      }
      const existingSettings =
        typeof ws.settings === "object" && ws.settings !== null ? ws.settings : {};
      data.settings = {
        ...existingSettings,
        ...dto.settings
      };
    }
    return this.toWorkspaceDto(
      await this.prisma.workspace.update({
        where: { id },
        data
      })
    );
  }

  async create(
    userId: string,
    dto: { name: string; slug?: string }
  ): Promise<WorkspaceWithRoleDto> {
    const slugify = (name: string) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 64);

    let slug = dto.slug ?? slugify(dto.name);
    if (!slug) {
      slug = `workspace-${Date.now()}`;
    }
    const slugTaken = await this.prisma.workspace.findUnique({ where: { slug } });
    if (slugTaken) {
      slug = `${slug}-${Date.now()}`;
    }

    await this.assertNameAvailable(dto.name);

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: dto.name,
          slug,
          settings: {}
        }
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: "ADMIN"
        }
      });

      return this.toWorkspaceWithRole(workspace, "ADMIN");
    });
  }

  private async assertNameAvailable(name: string, excludeWorkspaceId?: string) {
    const existing = await this.prisma.workspace.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...(excludeWorkspaceId ? { id: { not: excludeWorkspaceId } } : {})
      }
    });
    if (existing) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "A workspace with this name already exists.",
        HttpStatus.CONFLICT
      );
    }
  }

  private toListItem(
    workspace: { id: string; name: string },
    role: "ADMIN" | "MEMBER"
  ): WorkspaceListItemDto {
    return { id: workspace.id, name: workspace.name, role };
  }

  private toWorkspaceDto(workspace: {
    id: string;
    name: string;
    slug: string;
    settings: unknown;
  }): WorkspaceDto {
    const settings =
      typeof workspace.settings === "object" && workspace.settings !== null
        ? (workspace.settings as Record<string, unknown>)
        : undefined;
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      ...(settings ? { settings } : {})
    };
  }

  private toWorkspaceWithRole(
    workspace: { id: string; name: string; slug: string; settings: unknown },
    role: "ADMIN" | "MEMBER"
  ): WorkspaceWithRoleDto {
    return { ...this.toWorkspaceDto(workspace), role };
  }

  private toMemberPickerDto(member: {
    id: string;
    userId: string;
    user: { name: string; email: string };
  }): WorkspaceMemberPickerDto {
    return {
      id: member.id,
      userId: member.userId,
      userName: member.user.name,
      userEmail: member.user.email
    };
  }

  private async getMembership(workspaceId: string, memberId: string) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      include: { user: true }
    });
    if (!member) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Workspace member not found",
        HttpStatus.NOT_FOUND
      );
    }
    return member;
  }

  private countAdmins(workspaceId: string) {
    return this.prisma.workspaceMember.count({
      where: { workspaceId, role: "ADMIN" }
    });
  }

  private toMemberDto(member: WorkspaceMemberWithUser) {
    return {
      id: member.id,
      workspaceId: member.workspaceId,
      userId: member.userId,
      role: member.role as "ADMIN" | "MEMBER",
      isActive: member.isActive,
      userName: member.user.name,
      userEmail: member.user.email
    };
  }
}
