import { ErrorCodes } from "@kloqra/contracts";
import type { InviteMemberDto, UpdateWorkspaceMemberDto } from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

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

    await this.prisma.workspaceMember.delete({ where: { id: memberId } });
    return { ok: true as const };
  }

  async invite(workspaceId: string, dto: InviteMemberDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "User must register first",
        HttpStatus.NOT_FOUND
      );
    }
    const existing = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } }
    });
    if (existing) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Already a member",
        HttpStatus.CONFLICT
      );
    }
    return this.prisma.workspaceMember.create({
      data: { workspaceId, userId: user.id, role: dto.role }
    });
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
      role: member.role,
      userName: member.user.name,
      userEmail: member.user.email
    };
  }
}
