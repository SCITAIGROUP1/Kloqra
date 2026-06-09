import type { CreateTaskDto, UpdateTaskDto } from "@chronomint/contracts";
import { ErrorCodes } from "@chronomint/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { ProjectAccessService } from "../../../common/access/project-access.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

type TaskWithCategory = {
  id: string;
  projectId: string;
  categoryId: string;
  taskName: string;
  billableDefault: boolean;
  category?: { name: string } | null;
};

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService
  ) {}

  toDto(t: TaskWithCategory) {
    return {
      id: t.id,
      projectId: t.projectId,
      categoryId: t.categoryId,
      ...(t.category?.name ? { categoryName: t.category.name } : {}),
      taskName: t.taskName,
      billableDefault: t.billableDefault
    };
  }

  async list(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    projectId?: string,
    categoryId?: string
  ) {
    let projectIds = await this.access.accessibleProjectIds(workspaceId, userId, role);
    if (projectId) {
      if (!projectIds.includes(projectId)) return [];
      projectIds = [projectId];
    }
    if (projectIds.length === 0) return [];

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        ...(categoryId ? { categoryId } : {})
      },
      include: { category: { select: { name: true } } },
      orderBy: [{ category: { name: "asc" } }, { taskName: "asc" }]
    });
    return tasks.map((t) => this.toDto(t));
  }

  async create(workspaceId: string, dto: CreateTaskDto) {
    await this.assertProjectInWorkspace(workspaceId, dto.projectId);
    await this.assertCategoryInWorkspace(workspaceId, dto.categoryId);
    const t = await this.prisma.task.create({
      data: {
        projectId: dto.projectId,
        categoryId: dto.categoryId,
        taskName: dto.taskName,
        billableDefault: dto.billableDefault ?? true
      },
      include: { category: { select: { name: true } } }
    });
    return this.toDto(t);
  }

  async update(workspaceId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.assertWorkspaceTask(workspaceId, id);
    if (dto.categoryId && dto.categoryId !== task.categoryId) {
      await this.assertCategoryInWorkspace(workspaceId, dto.categoryId);
    }
    const t = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        ...(dto.taskName !== undefined ? { taskName: dto.taskName } : {}),
        ...(dto.billableDefault !== undefined ? { billableDefault: dto.billableDefault } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {})
      },
      include: { category: { select: { name: true } } }
    });
    return this.toDto(t);
  }

  async remove(workspaceId: string, id: string) {
    const task = await this.assertWorkspaceTask(workspaceId, id);
    await this.prisma.task.delete({ where: { id: task.id } });
    return { ok: true };
  }

  private async assertWorkspaceTask(workspaceId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, project: { workspaceId } }
    });
    if (!task) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Task not found", HttpStatus.NOT_FOUND);
    }
    return task;
  }

  private async assertProjectInWorkspace(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true }
    });
    if (!project) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    }
  }

  private async assertCategoryInWorkspace(workspaceId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, workspaceId },
      select: { id: true }
    });
    if (!category) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Category not found in this workspace",
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
