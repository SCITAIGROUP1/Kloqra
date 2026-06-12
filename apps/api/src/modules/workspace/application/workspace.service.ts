import { ErrorCodes } from "@kloqra/contracts";
import type {
  InviteMemberDto,
  InviteMemberResponseDto,
  UpdateWorkspaceMemberDto
} from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import {
  deriveNameFromEmail,
  generateTempPassword,
  hashPassword
} from "../../../common/auth/password.util";
import { DomainException } from "../../../common/errors/domain.exception";
import { MemberProvisioningMailer } from "../../../common/mailer/member-provisioning.mailer";
import { PrismaService } from "../../../common/prisma/prisma.service";
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

  async listForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true }
    });
    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role
    }));
  }

  async listMembers(workspaceId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true }
    });
    return members.map((m) => this.toMemberDto(m));
  }

  async updateMember(
    workspaceId: string,
    memberId: string,
    dto: UpdateWorkspaceMemberDto,
    _actingUserId: string
  ) {
    const member = await this.getMembership(workspaceId, memberId);

    if (member.role === dto.role) {
      return this.toMemberDto(member);
    }

    if (member.role === "ADMIN" && dto.role === "MEMBER") {
      const adminCount = await this.countAdmins(workspaceId);
      if (adminCount <= 1) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "Cannot demote the last workspace admin",
          HttpStatus.FORBIDDEN
        );
      }
    }

    const updated = await this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: { user: true }
    });
    return this.toMemberDto(updated);
  }

  async removeMember(workspaceId: string, memberId: string, actingUserId: string) {
    const member = await this.getMembership(workspaceId, memberId);

    if (member.userId === actingUserId) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Cannot remove yourself from the workspace",
        HttpStatus.FORBIDDEN
      );
    }

    if (member.role === "ADMIN") {
      const adminCount = await this.countAdmins(workspaceId);
      if (adminCount <= 1) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "Cannot remove the last workspace admin",
          HttpStatus.FORBIDDEN
        );
      }
    }

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    await this.prisma.workspaceMember.delete({ where: { id: memberId } });

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
        },
        excludeUserId: actingUserId
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
      const displayName = dto.name?.trim() || deriveNameFromEmail(email);
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

    let emailSent = false;
    let emailSkipReason: "smtp_unconfigured" | "send_failed" | undefined;

    if (userCreated && temporaryPassword) {
      const mailResult = await this.memberMailer.sendNewMemberCredentials({
        to: email,
        workspaceName: workspace.name,
        inviterName,
        temporaryPassword
      });
      emailSent = mailResult.sent;
      emailSkipReason = mapEmailSkipReason(mailResult.reason);
    } else {
      const mailResult = await this.memberMailer.sendWorkspaceAdded({
        to: email,
        workspaceName: workspace.name,
        inviterName
      });
      emailSent = mailResult.sent;
      emailSkipReason = mapEmailSkipReason(mailResult.reason);
    }

    void this.notificationsDispatch
      .notifyWorkspaceAdmins(workspaceId, {
        templateId: "member.joined",
        context: {
          memberName: membership.user.name,
          workspaceName: workspace.name,
          inviterName: inviterName
        },
        excludeUserId: invitedByUserId
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
      member: this.toMemberDto(membership),
      userCreated,
      emailSent,
      ...(emailSkipReason ? { emailSkipReason } : {})
    };
  }

  async update(id: string, dto: { name?: string; settings?: any }) {
    const data: any = {};
    if (dto.name !== undefined) {
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
    return this.prisma.workspace.update({
      where: { id },
      data
    });
  }

  async create(userId: string, dto: { name: string; slug?: string }) {
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

      return {
        ...workspace,
        role: "ADMIN"
      };
    });
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

  private toMemberDto(member: {
    id: string;
    workspaceId: string;
    userId: string;
    role: string;
    user: { name: string; email: string };
  }) {
    return {
      id: member.id,
      workspaceId: member.workspaceId,
      userId: member.userId,
      role: member.role as "ADMIN" | "MEMBER",
      userName: member.user.name,
      userEmail: member.user.email
    };
  }
}

function mapEmailSkipReason(
  reason?: "unconfigured" | "failed"
): "smtp_unconfigured" | "send_failed" | undefined {
  if (reason === "unconfigured") return "smtp_unconfigured";
  if (reason === "failed") return "send_failed";
  return undefined;
}
