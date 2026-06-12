import type { CreateTaskDto, ListTasksQuery, UpdateTaskDto } from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { ProjectAccessService } from "../../../common/access/project-access.service";
import { DomainException } from "../../../common/errors/domain.exception";
import {
  emptyPaginatedResponse,
  paginationSkipTake,
  toPaginatedResponse
} from "../../../common/http/pagination.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { NotificationsDispatchService } from "../../notifications/application/notifications-dispatch.service";

type TaskWithRelations = {
  id: string;
  projectId: string;
  categoryId: string;
  taskName: string;
  billableDefault: boolean;
  category?: { name: string } | null;
  assignees?: { userId: string; user: { name: string } }[];
};

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService,
    private notificationsDispatch: NotificationsDispatchService
  ) {}

  toDto(t: TaskWithRelations) {
    return {
      id: t.id,
      projectId: t.projectId,
      categoryId: t.categoryId,
      ...(t.category?.name ? { categoryName: t.category.name } : {}),
      taskName: t.taskName,
      billableDefault: t.billableDefault,
      assignees: (t.assignees ?? []).map((a) => ({
        userId: a.userId,
        userName: a.user.name
      }))
    };
  }

  private taskInclude() {
    return {
      category: { select: { name: true } },
      assignees: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { user: { name: "asc" as const } }
      }
    };
  }

  async list(workspaceId: string, userId: string, role: "ADMIN" | "MEMBER", query: ListTasksQuery) {
    let projectIds = await this.access.accessibleProjectIds(workspaceId, userId, role);
    if (query.projectId) {
      if (!projectIds.includes(query.projectId)) {
        return emptyPaginatedResponse(query.page, query.limit);
      }
      projectIds = [query.projectId];
    }
    if (projectIds.length === 0) {
      return emptyPaginatedResponse(query.page, query.limit);
    }

    const where = {
      projectId: { in: projectIds },
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(role === "MEMBER" ? { assignees: { some: { userId } } } : {}),
      ...(query.search
        ? {
            OR: [
              { taskName: { contains: query.search, mode: "insensitive" as const } },
              { category: { name: { contains: query.search, mode: "insensitive" as const } } }
            ]
          }
        : {})
    };

    const [total, tasks] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        include: this.taskInclude(),
        orderBy: [{ category: { name: "asc" } }, { taskName: "asc" }],
        ...paginationSkipTake(query.page, query.limit)
      })
    ]);

    return toPaginatedResponse(
      tasks.map((t) => this.toDto(t)),
      total,
      query.page,
      query.limit
    );
  }

  async create(workspaceId: string, dto: CreateTaskDto) {
    await this.assertProjectInWorkspace(workspaceId, dto.projectId);
    await this.assertCategoryInWorkspace(workspaceId, dto.categoryId);
    await this.assertAssigneesOnProject(dto.projectId, dto.assigneeUserIds);

    const t = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          projectId: dto.projectId,
          categoryId: dto.categoryId,
          taskName: dto.taskName,
          billableDefault: dto.billableDefault ?? true
        }
      });
      await tx.taskAssignee.createMany({
        data: dto.assigneeUserIds.map((assigneeUserId) => ({
          taskId: task.id,
          userId: assigneeUserId
        }))
      });
      return tx.task.findUniqueOrThrow({
        where: { id: task.id },
        include: this.taskInclude()
      });
    });

    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      select: { name: true, workspaceId: true }
    });
    if (project) {
      for (const assigneeUserId of dto.assigneeUserIds) {
        void this.notificationsDispatch
          .notify({
            userId: assigneeUserId,
            workspaceId: project.workspaceId,
            templateId: "task.assigned",
            context: {
              taskName: dto.taskName,
              projectName: project.name,
              taskId: t.id,
              projectId: dto.projectId
            }
          })
          .catch(() => undefined);
      }
    }

    return this.toDto(t);
  }

  async update(workspaceId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.assertWorkspaceTask(workspaceId, id);
    if (dto.categoryId && dto.categoryId !== task.categoryId) {
      await this.assertCategoryInWorkspace(workspaceId, dto.categoryId);
    }
    if (dto.assigneeUserIds) {
      await this.assertAssigneesOnProject(task.projectId, dto.assigneeUserIds);
    }

    const t = await this.prisma.$transaction(async (tx) => {
      if (dto.assigneeUserIds) {
        await tx.taskAssignee.deleteMany({ where: { taskId: task.id } });
        await tx.taskAssignee.createMany({
          data: dto.assigneeUserIds.map((assigneeUserId) => ({
            taskId: task.id,
            userId: assigneeUserId
          }))
        });
      }

      return tx.task.update({
        where: { id: task.id },
        data: {
          ...(dto.taskName !== undefined ? { taskName: dto.taskName } : {}),
          ...(dto.billableDefault !== undefined ? { billableDefault: dto.billableDefault } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {})
        },
        include: this.taskInclude()
      });
    });

    return this.toDto(t);
  }

  async remove(workspaceId: string, id: string) {
    const task = await this.assertWorkspaceTask(workspaceId, id);
    await this.prisma.task.delete({ where: { id: task.id } });
    return { ok: true };
  }

  async countUnassigned(workspaceId: string, projectId: string) {
    return this.prisma.task.count({
      where: {
        projectId,
        project: { workspaceId },
        assignees: { none: {} }
      }
    });
  }

  private async assertAssigneesOnProject(projectId: string, assigneeUserIds: string[]) {
    const uniqueIds = [...new Set(assigneeUserIds)];
    if (uniqueIds.length === 0) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "At least one assignee is required",
        HttpStatus.BAD_REQUEST
      );
    }

    const members = await this.prisma.teamMember.findMany({
      where: {
        userId: { in: uniqueIds },
        isActive: true,
        team: { projectId }
      },
      select: { userId: true }
    });

    if (members.length !== uniqueIds.length) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "All assignees must be active members of this project team",
        HttpStatus.BAD_REQUEST
      );
    }
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
