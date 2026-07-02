import { PassThrough } from "stream";
import {
  ErrorCodes,
  MAX_REPORT_RANGE_DAYS,
  type ExportBodyDto,
  type TenantDataExportJobDto
} from "@kloqra/contracts";
import { InjectQueue } from "@nestjs/bullmq";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import archiver from "archiver";
import { Queue } from "bullmq";
import { DomainException } from "../../../common/errors/domain.exception";
import { MailerService } from "../../../common/mailer/mailer.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";
/* eslint-disable no-restricted-imports -- compliance export worker reuses export module storage helpers */
import {
  buildExportJobStorageKey,
  readExportJobFile,
  writeExportJobFile
} from "../../export/application/export-job-storage.util";
import { ExportService } from "../../export/application/export.service";
/* eslint-enable no-restricted-imports */

const JOB_RETENTION_DAYS = 7;

type TenantDataExportJobRow = {
  id: string;
  tenantId: string;
  requestedByUserId: string;
  status: string;
  filename: string | null;
  contentType: string | null;
  byteSize: number | null;
  storageKey: string | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
  expiresAt: Date | null;
};

@Injectable()
export class TenantDataExportService {
  private readonly logger = new Logger(TenantDataExportService.name);

  constructor(
    private prisma: PrismaService,
    private exportService: ExportService,
    private mailer: MailerService,
    @InjectQueue(QUEUES.TENANT_DATA_EXPORT) private readonly exportQueue: Queue
  ) {}

  async create(tenantId: string, requestedByUserId: string): Promise<TenantDataExportJobDto> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Tenant not found", HttpStatus.NOT_FOUND);
    }
    if (tenant.status === "churned") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Data export is not available for churned organizations",
        HttpStatus.FORBIDDEN
      );
    }

    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + JOB_RETENTION_DAYS);

    const row = await this.prisma.tenantDataExportJob.create({
      data: {
        tenantId,
        requestedByUserId,
        status: "queued",
        expiresAt
      }
    });

    try {
      await this.exportQueue.add("runTenantExport", { jobId: row.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to enqueue tenant export ${row.id}: ${message}`);
      await this.prisma.tenantDataExportJob.update({
        where: { id: row.id },
        data: { status: "failed", errorMessage: "Failed to queue export task" }
      });
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Failed to enqueue tenant data export",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return this.toDto(row);
  }

  async get(tenantId: string, jobId: string): Promise<TenantDataExportJobDto> {
    const row = await this.prisma.tenantDataExportJob.findFirst({
      where: { id: jobId, tenantId }
    });
    if (!row) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Export job not found", HttpStatus.NOT_FOUND);
    }
    return this.toDto(row);
  }

  async download(
    tenantId: string,
    jobId: string
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const row = await this.prisma.tenantDataExportJob.findFirst({
      where: { id: jobId, tenantId }
    });
    if (!row || row.status !== "ready" || !row.storageKey || !row.filename || !row.contentType) {
      throw new DomainException(
        ErrorCodes.EXPORT_NOT_READY,
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

  async getLatestCompletedJob(tenantId: string): Promise<TenantDataExportJobRow | null> {
    return this.prisma.tenantDataExportJob.findFirst({
      where: { tenantId, status: "ready" },
      orderBy: { completedAt: "desc" }
    });
  }

  async runJob(jobId: string): Promise<void> {
    const job = await this.prisma.tenantDataExportJob.findUnique({
      where: { id: jobId },
      include: {
        tenant: {
          include: {
            workspaces: { select: { id: true, name: true, slug: true } },
            members: {
              where: { isActive: true },
              include: { user: { select: { email: true, name: true } } }
            },
            subscription: { include: { plan: true } }
          }
        }
      }
    });
    if (!job || job.status !== "queued") return;

    await this.prisma.tenantDataExportJob.update({
      where: { id: jobId },
      data: { status: "running" }
    });

    try {
      const manifest = {
        exportedAt: new Date().toISOString(),
        tenant: {
          id: job.tenant.id,
          name: job.tenant.name,
          slug: job.tenant.slug,
          status: job.tenant.status,
          createdAt: job.tenant.createdAt.toISOString()
        },
        subscription: job.tenant.subscription
          ? {
              planSlug: job.tenant.subscription.plan.slug,
              planName: job.tenant.subscription.plan.name,
              status: job.tenant.subscription.status
            }
          : null,
        workspaces: job.tenant.workspaces.map((w) => ({ id: w.id, name: w.name, slug: w.slug })),
        members: job.tenant.members.map((m) => ({
          email: m.user.email,
          name: m.user.name,
          role: m.role
        }))
      };

      const archive = archiver("zip", { zlib: { level: 6 } });
      const chunks: Buffer[] = [];
      const collector = new PassThrough();
      collector.on("data", (chunk: Buffer) => chunks.push(chunk));
      archive.pipe(collector);

      archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

      const rangeEnd = new Date();
      for (const workspace of job.tenant.workspaces) {
        let windowStart = new Date(job.tenant.createdAt);
        let part = 0;
        while (windowStart < rangeEnd) {
          const windowEnd = new Date(windowStart);
          windowEnd.setUTCDate(windowEnd.getUTCDate() + MAX_REPORT_RANGE_DAYS);
          const effectiveEnd = windowEnd < rangeEnd ? windowEnd : rangeEnd;
          const body: ExportBodyDto = {
            from: windowStart.toISOString(),
            to: effectiveEnd.toISOString(),
            reportTypes: ["time_entries"],
            format: "json",
            columns: {},
            billable: "all",
            groupBy: [],
            sheetLayout: "standard"
          };
          const result = await this.exportService.generate(workspace.id, body);
          const suffix = part > 0 ? `-part${part + 1}` : "";
          archive.append(result.buffer, {
            name: `workspaces/${workspace.slug}/time-entries${suffix}.json`
          });
          windowStart = effectiveEnd;
          part += 1;
        }
      }

      await archive.finalize();
      await new Promise<void>((resolve, reject) => {
        collector.on("end", () => resolve());
        collector.on("error", reject);
      });

      const buffer = Buffer.concat(chunks);
      const filename = `${job.tenant.slug}-data-export.zip`;
      const storageKey = buildExportJobStorageKey(jobId, "zip");
      await writeExportJobFile(storageKey, buffer);

      const completedAt = new Date();
      await this.prisma.tenantDataExportJob.update({
        where: { id: jobId },
        data: {
          status: "ready",
          filename,
          contentType: "application/zip",
          byteSize: buffer.length,
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
            subject: `[Kloqra] Organization data export ready`,
            html: `
              <p>Hi ${user.name},</p>
              <p>Your organization data export <strong>${filename}</strong> is ready. Download it from Account → Data &amp; privacy.</p>
              <p>Files are kept for ${JOB_RETENTION_DAYS} days.</p>
            `.trim()
          })
          .catch(() => undefined);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Tenant export job ${jobId} failed: ${message}`);
      await this.prisma.tenantDataExportJob.update({
        where: { id: jobId },
        data: { status: "failed", errorMessage: message.slice(0, 500) }
      });
    }
  }

  private toDto(row: TenantDataExportJobRow): TenantDataExportJobDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      requestedByUserId: row.requestedByUserId,
      status: row.status as TenantDataExportJobDto["status"],
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
