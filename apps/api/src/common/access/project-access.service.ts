import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../errors/domain.exception";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProjectAccessService {
  constructor(private prisma: PrismaService) {}

  async accessibleProjectIds(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER"
  ): Promise<string[]> {
    if (role === "ADMIN") {
      const rows = await this.prisma.project.findMany({
        where: { workspaceId },
        select: { id: true }
      });
      return rows.map((r) => r.id);
    }
    const rows = await this.prisma.teamMember.findMany({
      where: {
        userId,
        isActive: true,
        team: { project: { workspaceId, isActive: true } }
      },
      select: { team: { select: { projectId: true } } }
    });
    return rows.map((r) => r.team.projectId);
  }

  async assertCanAccessProject(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    projectId: string
  ) {
    if (role === "ADMIN") {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, workspaceId }
      });
      if (!project) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "You are not on this project's team",
          HttpStatus.FORBIDDEN
        );
      }
      return;
    }

    const membership = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        isActive: true,
        team: { projectId, project: { workspaceId, isActive: true } }
      }
    });
    if (!membership) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "You are not on this project's team",
        HttpStatus.FORBIDDEN
      );
    }
  }

  async assertCanLogTask(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    taskId: string
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, project: { workspaceId } },
      select: { id: true, projectId: true, isCommon: true }
    });
    if (!task) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Task not found", HttpStatus.NOT_FOUND);
    }

    await this.assertCanAccessProject(workspaceId, userId, role, task.projectId);

    if (role === "ADMIN") return;
    if (task.isCommon) return;

    const assignee = await this.prisma.taskAssignee.findFirst({
      where: { taskId, userId }
    });
    if (!assignee) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "You are not assigned to this task",
        HttpStatus.FORBIDDEN
      );
    }
  }
}
