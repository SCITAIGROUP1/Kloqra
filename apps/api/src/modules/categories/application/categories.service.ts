import type { CreateCategoryDto, UpdateCategoryDto } from "@chronomint/contracts";
import { ErrorCodes } from "@chronomint/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

type CategoryRow = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
};

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  toDto(c: CategoryRow, taskCount?: number) {
    return {
      id: c.id,
      workspaceId: c.workspaceId,
      name: c.name,
      description: c.description,
      ...(typeof taskCount === "number" ? { taskCount } : {})
    };
  }

  async list(workspaceId: string) {
    const rows = await this.prisma.category.findMany({
      where: { workspaceId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { name: "asc" }
    });
    return rows.map((r) => this.toDto(r, r._count.tasks));
  }

  async create(workspaceId: string, dto: CreateCategoryDto) {
    await this.assertNameAvailable(workspaceId, dto.name);
    const row = await this.prisma.category.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description ?? null
      }
    });
    return this.toDto(row, 0);
  }

  async update(workspaceId: string, id: string, dto: UpdateCategoryDto) {
    const existing = await this.assertOwned(workspaceId, id);
    if (dto.name && dto.name !== existing.name) {
      await this.assertNameAvailable(workspaceId, dto.name);
    }
    const row = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {})
      },
      include: { _count: { select: { tasks: true } } }
    });
    return this.toDto(row, row._count.tasks);
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.assertOwned(workspaceId, id);
    const taskCount = await this.prisma.task.count({ where: { categoryId: existing.id } });
    if (taskCount > 0) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Cannot delete a category that still has tasks. Move or delete the tasks first.",
        HttpStatus.CONFLICT
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }

  async assertOwned(workspaceId: string, id: string) {
    const row = await this.prisma.category.findFirst({ where: { id, workspaceId } });
    if (!row) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Category not found", HttpStatus.NOT_FOUND);
    }
    return row;
  }

  private async assertNameAvailable(workspaceId: string, name: string) {
    const existing = await this.prisma.category.findFirst({
      where: { workspaceId, name }
    });
    if (existing) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "A category with that name already exists",
        HttpStatus.CONFLICT
      );
    }
  }
}
