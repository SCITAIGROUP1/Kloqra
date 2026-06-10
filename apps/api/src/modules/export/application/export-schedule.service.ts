import {
  createExportScheduleSchema,
  ErrorCodes,
  exportBodySchema,
  type CreateExportScheduleDto,
  type ExportScheduleDto,
  type ExportScheduleFrequency,
  type UpdateExportScheduleDto
} from "@kloqra/contracts";
import {
  HttpStatus,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit
} from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { MailerService } from "../../../common/mailer/mailer.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { ExportService } from "./export.service";

@Injectable()
export class ExportScheduleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExportScheduleService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private exportService: ExportService,
    private mailer: MailerService
  ) {}

  onModuleInit() {
    if (!process.env.DATABASE_URL?.trim()) {
      this.logger.warn("DATABASE_URL not set — export schedule worker disabled.");
      return;
    }
    this.timer = setInterval(() => {
      void this.processDueSchedules().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Export schedule tick failed: ${message}`);
      });
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async list(workspaceId: string): Promise<ExportScheduleDto[]> {
    const rows = await this.prisma.exportSchedule.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" }
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(workspaceId: string, dto: CreateExportScheduleDto): Promise<ExportScheduleDto> {
    const parsed = createExportScheduleSchema.parse(dto);
    exportBodySchema.parse(parsed.body);

    const row = await this.prisma.exportSchedule.create({
      data: {
        workspaceId,
        name: parsed.name,
        frequency: parsed.frequency,
        recipientEmails: parsed.recipientEmails,
        body: parsed.body,
        enabled: parsed.enabled,
        nextRunAt: this.computeNextRun(parsed.frequency, new Date())
      }
    });
    return this.toDto(row);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateExportScheduleDto
  ): Promise<ExportScheduleDto> {
    const existing = await this.prisma.exportSchedule.findFirst({
      where: { id, workspaceId }
    });
    if (!existing) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Schedule not found", HttpStatus.NOT_FOUND);
    }

    if (dto.body) exportBodySchema.parse(dto.body);

    const frequency = (dto.frequency ?? existing.frequency) as ExportScheduleFrequency;
    const row = await this.prisma.exportSchedule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.frequency !== undefined ? { frequency: dto.frequency } : {}),
        ...(dto.recipientEmails !== undefined ? { recipientEmails: dto.recipientEmails } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.frequency !== undefined
          ? { nextRunAt: this.computeNextRun(frequency, new Date()) }
          : {})
      }
    });
    return this.toDto(row);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const row = await this.prisma.exportSchedule.findFirst({
      where: { id, workspaceId }
    });
    if (!row) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Schedule not found", HttpStatus.NOT_FOUND);
    }
    await this.prisma.exportSchedule.delete({ where: { id } });
  }

  private async processDueSchedules() {
    if (!process.env.DATABASE_URL?.trim()) return;

    const due = await this.prisma.exportSchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: new Date() }
      },
      take: 10
    });

    for (const schedule of due) {
      await this.runSchedule(schedule.id);
    }
  }

  private async runSchedule(scheduleId: string) {
    const schedule = await this.prisma.exportSchedule.findUnique({
      where: { id: scheduleId }
    });
    if (!schedule || !schedule.enabled) return;

    try {
      const body = exportBodySchema.parse(schedule.body);
      const result = await this.exportService.generate(schedule.workspaceId, body);

      const recipients = schedule.recipientEmails;
      this.logger.log(
        `Schedule "${schedule.name}": generated ${result.filename} (${result.buffer.length} bytes) — sending to ${recipients.join(", ")}`
      );

      // Determine MIME type from filename extension
      const ext = result.filename.split(".").pop()?.toLowerCase();
      const contentType =
        ext === "pdf"
          ? "application/pdf"
          : ext === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv";

      await this.mailer.send({
        to: recipients,
        subject: `[Kloqra] Scheduled export: ${schedule.name}`,
        html: `
          <p>Hi,</p>
          <p>Your scheduled export <strong>${schedule.name}</strong> is ready. Please find the file attached.</p>
          <p>This report was generated automatically by Kloqra.</p>
        `.trim(),
        attachments: [
          {
            filename: result.filename,
            content: result.buffer,
            contentType
          }
        ]
      });

      await this.prisma.exportSchedule.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: "ok",
          lastRunError: null,
          nextRunAt: this.computeNextRun(schedule.frequency as ExportScheduleFrequency, new Date())
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      await this.prisma.exportSchedule.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: "error",
          lastRunError: message,
          nextRunAt: this.computeNextRun(schedule.frequency as ExportScheduleFrequency, new Date())
        }
      });
    }
  }

  computeNextRun(frequency: ExportScheduleFrequency, from: Date): Date {
    const next = new Date(from);
    if (frequency === "daily") {
      next.setUTCDate(next.getUTCDate() + 1);
      next.setUTCHours(6, 0, 0, 0);
    } else if (frequency === "weekly") {
      next.setUTCDate(next.getUTCDate() + 7);
      next.setUTCHours(6, 0, 0, 0);
    } else {
      next.setUTCMonth(next.getUTCMonth() + 1);
      next.setUTCDate(1);
      next.setUTCHours(6, 0, 0, 0);
    }
    return next;
  }

  private toDto(row: {
    id: string;
    workspaceId: string;
    name: string;
    frequency: string;
    recipientEmails: string[];
    body: unknown;
    enabled: boolean;
    nextRunAt: Date;
    lastRunAt: Date | null;
    lastRunStatus: string | null;
    lastRunError: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ExportScheduleDto {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      frequency: row.frequency as ExportScheduleFrequency,
      recipientEmails: row.recipientEmails,
      body: exportBodySchema.parse(row.body),
      enabled: row.enabled,
      nextRunAt: row.nextRunAt.toISOString(),
      lastRunAt: row.lastRunAt?.toISOString() ?? null,
      lastRunStatus: row.lastRunStatus,
      lastRunError: row.lastRunError,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
