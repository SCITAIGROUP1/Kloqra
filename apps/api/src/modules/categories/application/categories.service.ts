import type {
  BulkCategoryImportItemDto,
  CreateCategoryDto,
  ListCategoriesQuery,
  UpdateCategoryDto
} from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { InjectQueue } from "@nestjs/bullmq";
import { HttpStatus, Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import ExcelJS from "exceljs";
import type { Response } from "express";
import { DomainException } from "../../../common/errors/domain.exception";
import { paginationSkipTake, toPaginatedResponse } from "../../../common/http/pagination.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";

type CategoryRow = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUES.BULK_CATEGORY) private readonly bulkCategoryQueue: Queue
  ) {}

  toListItem(c: CategoryRow, taskCount?: number) {
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      isActive: c.isActive,
      ...(typeof taskCount === "number" ? { taskCount } : {})
    };
  }

  toDto(c: CategoryRow, taskCount?: number) {
    return {
      id: c.id,
      workspaceId: c.workspaceId,
      name: c.name,
      description: c.description,
      isActive: c.isActive,
      ...(typeof taskCount === "number" ? { taskCount } : {})
    };
  }

  async list(workspaceId: string, query: ListCategoriesQuery) {
    const where = {
      workspaceId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { description: { contains: query.search, mode: "insensitive" as const } }
            ]
          }
        : {})
    };

    const [total, rows] = await Promise.all([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        include: { _count: { select: { tasks: true } } },
        orderBy: { name: "asc" },
        ...paginationSkipTake(query.page, query.limit)
      })
    ]);

    return toPaginatedResponse(
      rows.map((r) => this.toListItem(r, r._count.tasks)),
      total,
      query.page,
      query.limit
    );
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
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
      },
      include: { _count: { select: { tasks: true } } }
    });
    return this.toDto(row, row._count.tasks);
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.assertOwned(workspaceId, id);
    if (existing.name === "Uncategorized") {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Cannot delete the default Uncategorized category.",
        HttpStatus.BAD_REQUEST
      );
    }

    let uncategorized = await this.prisma.category.findFirst({
      where: { workspaceId, name: "Uncategorized" }
    });
    if (!uncategorized) {
      uncategorized = await this.prisma.category.create({
        data: {
          workspaceId,
          name: "Uncategorized",
          description: "System default category for uncategorized tasks."
        }
      });
    }

    await this.prisma.task.updateMany({
      where: { categoryId: existing.id },
      data: { categoryId: uncategorized.id }
    });

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

  async generateBulkCategoryTemplate(res: Response) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Categories");

    sheet.columns = [
      { header: "Name", key: "name", width: 30 },
      { header: "Description", key: "description", width: 40 }
    ];

    sheet.addRow({ name: "Development", description: "Engineering and coding work" });
    sheet.addRow({ name: "Design", description: "UX and visual design" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=categories_template.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  }

  async parseBulkCategoryExcel(buffer: Buffer): Promise<BulkCategoryImportItemDto[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Excel file is empty",
        HttpStatus.BAD_REQUEST
      );
    }

    const categories: BulkCategoryImportItemDto[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const name = row.getCell(1).text?.trim();
      const description = row.getCell(2).text?.trim();

      if (!name) return;

      categories.push({
        name,
        ...(description ? { description } : {})
      });
    });

    if (categories.length === 0) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "No valid categories found in the file",
        HttpStatus.BAD_REQUEST
      );
    }
    if (categories.length > 500) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Maximum 500 categories allowed per batch",
        HttpStatus.BAD_REQUEST
      );
    }

    return categories;
  }

  async bulkImport(workspaceId: string, categories: BulkCategoryImportItemDto[]) {
    if (categories.length === 0) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "No categories to import",
        HttpStatus.BAD_REQUEST
      );
    }

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Workspace not found", HttpStatus.NOT_FOUND);
    }

    const job = await this.bulkCategoryQueue.add(
      "bulkCategoryJob",
      { workspaceId, categories },
      { removeOnComplete: true, removeOnFail: false }
    );

    return {
      jobId: String(job.id!),
      status: "queued",
      enqueuedCount: categories.length
    };
  }
}
