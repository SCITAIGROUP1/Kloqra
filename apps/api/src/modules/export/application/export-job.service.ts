import {
  createExportJobSchema,
  ErrorCodes,
  exportBodySchema,
  type CreateExportJobDto,
  type ExportJobDto,
  type ExportJobStatus
} from "@kloqra/contracts";
import { InjectQueue } from "@nestjs/bullmq";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Queue } from "bullmq";
import { DomainException } from "../../../common/errors/domain.exception";
import { MailerService } from "../../../common/mailer/mailer.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";
import { NotificationsDispatchService } from "../../notifications/application/notifications-dispatch.service";
import {
  buildExportJobStorageKey,
  deleteExportJobFile,
  readExportJobFile,
  writeExportJobFile
} from "./export-job-storage.util";
import { ExportService } from "./export.service";

const JOB_RETENTION_DAYS = 7;

@Injectable()
export class ExportJobService {
  private readonly logger = new Logger(ExportJobService.name);

  constructor(
    private prisma: PrismaService,
    private exportService: ExportService,
    private mailer: MailerService,
    private notificationsDispatch: NotificationsDispatchService,
    @InjectQueue(QUEUES.EXPORT) private readonly exportQueue: Queue
  ) {}

  async list(workspaceId: string, limit = 20): Promise<ExportJobDto[]> {
    const rows = await this.prisma.exportJob.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return rows.map((row) => this.toDto(row));
  }

  async get(workspaceId: string, id: string): Promise<ExportJobDto> {
    const row = await this.prisma.exportJob.findFirst({
      where: { id, workspaceId }
    });
    if (!row) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Export job not found", HttpStatus.NOT_FOUND);
    }
    return this.toDto(row);
  }

  async create(
    workspaceId: string,
    requestedByUserId: string,
    dto: CreateExportJobDto
  ): Promise<ExportJobDto> {
    const parsed = createExportJobSchema.parse(dto);
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + JOB_RETENTION_DAYS);

    const row = await this.prisma.exportJob.create({
      data: {
        workspaceId,
        requestedByUserId,
        body: parsed,
        status: "queued",
        expiresAt
      }
    });

    try {
      await this.exportQueue.add("runExport", { jobId: row.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to enqueue export job ${row.id}: ${message}`);
      await this.prisma.exportJob.update({
        where: { id: row.id },
        data: { status: "failed", errorMessage: "Failed to queue export task" }
      });
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Failed to enqueue export job",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return this.toDto(row);
  }

  async download(
    workspaceId: string,
    id: string
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const row = await this.prisma.exportJob.findFirst({
      where: { id, workspaceId }
    });
    if (!row || row.status !== "ready" || !row.storageKey || !row.filename || !row.contentType) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Export file not ready",
        HttpStatus.NOT_FOUND
      );
    }
    if (row.expiresAt && row.expiresAt < new Date()) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Export file expired", HttpStatus.NOT_FOUND);
    }
    const buffer = await readExportJobFile(row.storageKey);
    return { buffer, contentType: row.contentType, filename: row.filename };
  }

  async runJob(jobId: string) {
    const job = await this.prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== "queued") return;

    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: { status: "running" }
    });

    try {
      const body = exportBodySchema.parse(job.body);
      const result = await this.exportService.generate(job.workspaceId, body);
      const ext = result.filename.split(".").pop()?.toLowerCase() ?? "bin";
      const storageKey = buildExportJobStorageKey(jobId, ext);
      await writeExportJobFile(storageKey, result.buffer);

      const completedAt = new Date();
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: "ready",
          filename: result.filename,
          contentType: result.contentType,
          byteSize: result.buffer.length,
          storageKey,
          completedAt,
          errorMessage: null
        }
      });

      const user = await this.prisma.user.findUnique({
        where: { id: job.requestedByUserId },
        select: { email: true, name: true }
      });
      if (user?.email) {
        void this.mailer
          .send({
            to: [user.email],
            subject: `[Kloqra] Your export is ready: ${result.filename}`,
            html: `
              <p>Hi ${user.name},</p>
              <p>Your export <strong>${result.filename}</strong> is ready. Open Exports in Kloqra to download it.</p>
              <p>Files are kept for ${JOB_RETENTION_DAYS} days.</p>
            `.trim()
          })
          .catch(() => undefined);
      }

      void this.notificationsDispatch
        .notify({
          userId: job.requestedByUserId,
          workspaceId: job.workspaceId,
          templateId: "export.job_ready",
          context: { filename: result.filename, jobId }
        })
        .catch(() => undefined);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Export failed";
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          errorMessage,
          completedAt: new Date()
        }
      });
    }
  }

  @Cron("0 4 * * *")
  async expireOldJobs() {
    const expired = await this.prisma.exportJob.findMany({
      where: {
        expiresAt: { lte: new Date() },
        status: { in: ["ready", "failed"] }
      },
      take: 20
    });

    for (const job of expired) {
      if (job.storageKey) {
        await deleteExportJobFile(job.storageKey).catch(() => undefined);
      }
      await this.prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "expired", storageKey: null }
      });
    }
  }

  private toDto(row: {
    id: string;
    workspaceId: string;
    requestedByUserId: string;
    body: unknown;
    status: string;
    filename: string | null;
    contentType: string | null;
    byteSize: number | null;
    errorMessage: string | null;
    createdAt: Date;
    completedAt: Date | null;
    expiresAt: Date | null;
  }): ExportJobDto {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      requestedByUserId: row.requestedByUserId,
      body: exportBodySchema.parse(row.body),
      status: row.status as ExportJobStatus,
      filename: row.filename,
      contentType: row.contentType,
      byteSize: row.byteSize,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null
    };
  }
}
