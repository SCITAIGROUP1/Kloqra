import { ErrorCodes } from "@chronomint/contracts";
import type { InviteMemberDto } from "@chronomint/contracts";
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
    return members.map((m) => ({
      id: m.id,
      workspaceId: m.workspaceId,
      userId: m.userId,
      role: m.role,
      userName: m.user.name,
      userEmail: m.user.email
    }));
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
}
