import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../errors/domain.exception";
import { PrismaService } from "../prisma/prisma.service";

export type WorkspaceRole = "ADMIN" | "MEMBER";

type TaskLoggabilityRow = {
  id: string;
  projectId: string;
  isCommon: boolean;
  isActive: boolean;
  category: { isActive: boolean };
  project: { isActive: boolean };
};

@Injectable()
export class ProjectAccessService {
  constructor(private prisma: PrismaService) {}

  async managedProjectIds(workspaceId: string, userId: string): Promise<string[]> {
    const rows = await this.prisma.teamMember.findMany({
      where: {
        userId,
        role: "PROJECT_MANAGER",
        isActive: true,
        team: { project: { workspaceId, isActive: true } }
      },
      select: { team: { select: { projectId: true } } }
    });
    return rows.map((row) => row.team.projectId);
  }

  async manageableProjectIds(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<string[]> {
    if (role === "ADMIN") {
      const rows = await this.prisma.project.findMany({
        where: { workspaceId },
        select: { id: true }
      });
      return rows.map((row) => row.id);
    }
    return this.managedProjectIds(workspaceId, userId);
  }

  async assertCanManageProject(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    projectId: string
  ): Promise<void> {
    if (role === "ADMIN") {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, workspaceId }
      });
      if (!project) {
        throw new DomainException(
          ErrorCodes.FORBIDDEN,
          "You cannot manage this project",
          HttpStatus.FORBIDDEN
        );
      }
      return;
    }

    const lead = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        role: "PROJECT_MANAGER",
        isActive: true,
        team: { projectId, project: { workspaceId, isActive: true } }
      }
    });
    if (!lead) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "You are not a project manager for this project",
        HttpStatus.FORBIDDEN
      );
    }
  }

  async accessibleProjectIds(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
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
        team: { project: { workspaceId } }
      },
      select: { team: { select: { projectId: true } } }
    });
    return rows.map((r) => r.team.projectId);
  }

  async assertCanAccessProject(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
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
        team: { projectId, project: { workspaceId } }
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

  private inactiveMessage(task: TaskLoggabilityRow): string {
    if (!task.project.isActive) return "This project is inactive";
    if (!task.category.isActive) return "This category is inactive";
    if (!task.isActive) return "This task is inactive";
    return "This task is not available for time logging";
  }

  async loadTaskLoggability(workspaceId: string, taskId: string): Promise<TaskLoggabilityRow> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, project: { workspaceId } },
      select: {
        id: true,
        projectId: true,
        isCommon: true,
        isActive: true,
        category: { select: { isActive: true } },
        project: { select: { isActive: true } }
      }
    });
    if (!task) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Task not found", HttpStatus.NOT_FOUND);
    }
    return task;
  }

  assertTaskLoggable(task: TaskLoggabilityRow) {
    if (task.project.isActive && task.category.isActive && task.isActive) {
      return;
    }
    throw new DomainException(
      ErrorCodes.ENTITY_INACTIVE,
      this.inactiveMessage(task),
      HttpStatus.FORBIDDEN
    );
  }

  async assertCanLogTask(workspaceId: string, userId: string, role: WorkspaceRole, taskId: string) {
    const task = await this.loadTaskLoggability(workspaceId, taskId);

    await this.assertCanAccessProject(workspaceId, userId, role, task.projectId);
    this.assertTaskLoggable(task);

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
