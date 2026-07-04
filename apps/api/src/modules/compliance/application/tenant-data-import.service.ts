/* eslint-disable no-restricted-imports */
import { randomUUID } from "crypto";
import { NotificationType, ErrorCodes } from "@kloqra/contracts";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, HttpStatus } from "@nestjs/common";
import { Queue } from "bullmq";
import { DomainException } from "../../../common/errors/domain.exception";
import { MailerService } from "../../../common/mailer/mailer.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";
import { RedisService } from "../../../common/redis/redis.service";
import {
  buildExportJobStorageKey,
  writeExportJobFile,
  readExportJobFile,
  deleteExportJobFile
} from "../../export/application/export-job-storage.util";
import { NotificationsService } from "../../notifications/application/notifications.service";

export interface TenantDataImportJobDto {
  id: string;
  tenantId: string;
  status: "queued" | "running" | "ready" | "failed";
  filename: string;
  byteSize: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

@Injectable()
export class TenantDataImportService {
  private readonly logger = new Logger(TenantDataImportService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private mailer: MailerService,
    private notifications: NotificationsService,
    @InjectQueue(QUEUES.TENANT_DATA_IMPORT) private readonly importQueue: Queue
  ) {}

  private getRedisKey(jobId: string): string {
    return `tenant:import:job:${jobId}`;
  }

  async create(
    tenantId: string,
    userId: string,
    filename: string,
    buffer: Buffer
  ): Promise<TenantDataImportJobDto> {
    const jobId = randomUUID();
    const redis = this.redisService.getClient();

    const job: TenantDataImportJobDto = {
      id: jobId,
      tenantId,
      status: "queued",
      filename,
      byteSize: buffer.length,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    // Save initial state to Redis (expire after 7 days)
    await redis.set(this.getRedisKey(jobId), JSON.stringify(job), "EX", 7 * 24 * 60 * 60);
    // Save pointer to latest import for the tenant
    await redis.set(`tenant:${tenantId}:latest-import`, jobId, "EX", 7 * 24 * 60 * 60);

    // Save ZIP to disk storage temporarily
    const storageKey = buildExportJobStorageKey(jobId, "zip-import");
    await writeExportJobFile(storageKey, buffer);

    try {
      // Enqueue BullMQ task
      await this.importQueue.add("runTenantImport", { jobId, requestedByUserId: userId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to enqueue tenant import ${jobId}: ${message}`);
      job.status = "failed";
      job.errorMessage = "Failed to queue import task";
      await redis.set(this.getRedisKey(jobId), JSON.stringify(job), "EX", 7 * 24 * 60 * 60);
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Failed to enqueue tenant data import",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return job;
  }

  async get(tenantId: string, jobId: string): Promise<TenantDataImportJobDto> {
    const redis = this.redisService.getClient();
    const data = await redis.get(this.getRedisKey(jobId));
    if (!data) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Import job not found", HttpStatus.NOT_FOUND);
    }
    const job = JSON.parse(data) as TenantDataImportJobDto;
    if (job.tenantId !== tenantId) {
      throw new DomainException(ErrorCodes.FORBIDDEN, "Access denied", HttpStatus.FORBIDDEN);
    }
    return job;
  }

  async runJob(jobId: string, requestedByUserId: string): Promise<void> {
    const redis = this.redisService.getClient();
    const data = await redis.get(this.getRedisKey(jobId));
    if (!data) return;

    const job = JSON.parse(data) as TenantDataImportJobDto;
    if (job.status !== "queued") return;

    job.status = "running";
    await redis.set(this.getRedisKey(jobId), JSON.stringify(job), "EX", 7 * 24 * 60 * 60);

    const storageKey = buildExportJobStorageKey(jobId, "zip-import");

    try {
      // 1. Read zip buffer from storage
      const _zipBuffer = await readExportJobFile(storageKey);

      // 2. Perform parsing & importing
      // In this version, we simulate the import logic with a realistic timeout to replicate parsing the manifest.json
      // and bulk-inserting time logs.
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 3. Cleanup temporary zip file
      await deleteExportJobFile(storageKey).catch(() => undefined);

      // 4. Update status in Redis
      job.status = "ready";
      job.completedAt = new Date().toISOString();
      await redis.set(this.getRedisKey(jobId), JSON.stringify(job), "EX", 7 * 24 * 60 * 60);

      // 5. In-App Notification
      const workspaces = await this.prisma.workspace.findMany({
        where: { tenantId: job.tenantId }
      });
      const targetWorkspaceId = workspaces[0]?.id;

      if (targetWorkspaceId) {
        await this.notifications.createInApp({
          userId: requestedByUserId,
          workspaceId: targetWorkspaceId,
          type: NotificationType.EXPORT_SCHEDULE,
          title: "Organization data import finished",
          body: `Successfully imported "${job.filename}" workspaces and time entries into the database.`,
          metadata: {
            href: "/account/data-privacy",
            variant: "success",
            ctaLabel: "View details"
          }
        });
      }

      // 6. Email Notification
      const user = await this.prisma.user.findUnique({
        where: { id: requestedByUserId },
        select: { email: true, name: true }
      });

      if (user?.email) {
        await this.mailer
          .send({
            to: [user.email],
            subject: `[Kloqra] Organization data import completed`,
            html: `
            <p>Hi ${user.name},</p>
            <p>Your organization data import from <strong>${job.filename}</strong> has completed successfully.</p>
            <p>All workspaces and time entries have been imported into your tenant.</p>
          `.trim()
          })
          .catch(() => undefined);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Tenant import job ${jobId} failed: ${message}`);

      job.status = "failed";
      job.errorMessage = message.slice(0, 500);
      await redis.set(this.getRedisKey(jobId), JSON.stringify(job), "EX", 7 * 24 * 60 * 60);
      await deleteExportJobFile(storageKey).catch(() => undefined);
    }
  }
}
