import {
  createExportPresetSchema,
  ErrorCodes,
  exportBodySchema,
  type CreateExportPresetDto,
  type ExportPresetDto
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class ExportPresetService {
  constructor(private prisma: PrismaService) {}

  async list(workspaceId: string): Promise<ExportPresetDto[]> {
    const rows = await this.prisma.exportPreset.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" }
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(workspaceId: string, dto: CreateExportPresetDto): Promise<ExportPresetDto> {
    const parsed = createExportPresetSchema.parse(dto);
    exportBodySchema.parse(parsed.body);

    try {
      const row = await this.prisma.exportPreset.create({
        data: {
          workspaceId,
          name: parsed.name,
          body: parsed.body
        }
      });
      return this.toDto(row);
    } catch {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "A preset with this name already exists",
        HttpStatus.CONFLICT
      );
    }
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const row = await this.prisma.exportPreset.findFirst({
      where: { id, workspaceId }
    });
    if (!row) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Preset not found", HttpStatus.NOT_FOUND);
    }
    await this.prisma.exportPreset.delete({ where: { id } });
  }

  private toDto(row: {
    id: string;
    workspaceId: string;
    name: string;
    body: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ExportPresetDto {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      body: exportBodySchema.parse(row.body),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
