import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Queue } from "bullmq";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";

@Injectable()
export class PlatformOperationsControlsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUES.MAIL) private mailQueue: Queue,
    @InjectQueue(QUEUES.BULK_INVITE) private bulkInviteQueue: Queue,
    @InjectQueue(QUEUES.BULK_CATEGORY) private bulkCategoryQueue: Queue,
    @InjectQueue(QUEUES.EXPORT) private exportQueue: Queue
  ) {}

  private getQueue(name: string): Queue {
    switch (name) {
      case QUEUES.MAIL:
        return this.mailQueue;
      case QUEUES.BULK_INVITE:
        return this.bulkInviteQueue;
      case QUEUES.BULK_CATEGORY:
        return this.bulkCategoryQueue;
      case QUEUES.EXPORT:
        return this.exportQueue;
      default:
        throw new NotFoundException(`Queue ${name} not found`);
    }
  }

  private async logAudit(
    actorId: string,
    action: string,
    tenantId: string | null,
    summary: Record<string, any>
  ): Promise<void> {
    await this.prisma.platformAuditEvent.create({
      data: {
        actorPlatformUserId: actorId,
        action,
        tenantId,
        summary: summary as Prisma.InputJsonValue
      }
    });
  }

  async getFailedJobs(name: string): Promise<any[]> {
    const queue = this.getQueue(name);
    const failedJobs = await queue.getJobs(["failed"], 0, 10);
    return failedJobs.map((job) => ({
      id: job.id,
      name: job.name,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace?.slice(0, 3) ?? [],
      timestamp: job.timestamp
    }));
  }

  async retryJob(name: string, jobId: string, actorId: string): Promise<{ ok: boolean }> {
    const queue = this.getQueue(name);
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found in queue ${name}`);
    }
    await job.retry();
    await this.logAudit(actorId, "queue.job_retry", null, { queueName: name, jobId });
    return { ok: true };
  }

  async pauseQueue(name: string, actorId: string): Promise<{ ok: boolean }> {
    const queue = this.getQueue(name);
    await queue.pause();
    await this.logAudit(actorId, "queue.pause", null, { queueName: name });
    return { ok: true };
  }

  async resumeQueue(name: string, actorId: string): Promise<{ ok: boolean }> {
    const queue = this.getQueue(name);
    await queue.resume();
    await this.logAudit(actorId, "queue.resume", null, { queueName: name });
    return { ok: true };
  }

  async retryFailedJobs(
    name: string,
    actorId: string
  ): Promise<{ ok: boolean; retriedCount: number }> {
    const queue = this.getQueue(name);
    const failedJobs = await queue.getJobs(["failed"]);
    await Promise.all(failedJobs.map((job) => job.retry()));
    await this.logAudit(actorId, "queue.retry_failed", null, {
      queueName: name,
      count: failedJobs.length
    });
    return { ok: true, retriedCount: failedJobs.length };
  }

  async overrideLimits(
    tenantId: string,
    limitsOverride: Record<string, any>,
    actorId: string
  ): Promise<{ ok: boolean }> {
    await this.prisma.tenantSubscription.updateMany({
      where: { tenantId },
      data: { limitsOverride: limitsOverride as Prisma.InputJsonValue }
    });
    await this.logAudit(actorId, "tenant.limits_override", tenantId, { limitsOverride });
    return { ok: true };
  }

  async updateGracePeriod(
    tenantId: string,
    graceDays: number,
    actorId: string
  ): Promise<{ ok: boolean }> {
    const override = { graceDays };
    await this.prisma.tenantSubscription.updateMany({
      where: { tenantId },
      data: {
        limitsOverride: override as Prisma.InputJsonValue
      }
    });
    await this.logAudit(actorId, "tenant.grace_period_update", tenantId, { graceDays });
    return { ok: true };
  }

  async revokeTenantSessions(
    tenantId: string,
    actorId: string
  ): Promise<{ ok: boolean; revokedCount: number }> {
    const members = await this.prisma.tenantMember.findMany({
      where: { tenantId, isActive: true },
      select: { userId: true }
    });
    const userIds = members.map((m) => m.userId);

    const now = new Date();
    const updateResult = await this.prisma.refreshToken.updateMany({
      where: { userId: { in: userIds }, revokedAt: null },
      data: { revokedAt: now }
    });

    await this.logAudit(actorId, "tenant.sessions_revoke", tenantId, {
      revokedCount: updateResult.count
    });
    return { ok: true, revokedCount: updateResult.count };
  }

  async resetTenantMfa(tenantId: string, actorId: string): Promise<{ ok: boolean }> {
    const members = await this.prisma.tenantMember.findMany({
      where: { tenantId, isActive: true },
      select: { userId: true }
    });
    const userIds = members.map((m) => m.userId);

    await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: {
        totpSecret: null,
        totpEnabledAt: null
      }
    });

    await this.logAudit(actorId, "tenant.mfa_reset", tenantId, {
      affectedUsersCount: userIds.length
    });
    return { ok: true };
  }

  async gdprExportTenant(tenantId: string, actorId: string): Promise<Record<string, any>> {
    const [tenant, workspaces, members, subscriptions] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
      this.prisma.workspace.findMany({
        where: { tenantId },
        include: {
          projects: {
            include: {
              tasks: {
                include: {
                  timeLogs: {
                    select: {
                      id: true,
                      startTime: true,
                      endTime: true,
                      durationSec: true,
                      description: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      this.prisma.tenantMember.findMany({
        where: { tenantId },
        include: { user: { select: { id: true, email: true, name: true } } }
      }),
      this.prisma.tenantSubscription.findMany({ where: { tenantId } })
    ]);

    await this.logAudit(actorId, "tenant.gdpr_export", tenantId, {});

    return {
      exportedAt: new Date().toISOString(),
      tenant,
      workspaces,
      members,
      subscriptions
    };
  }

  async gdprDeleteTenant(tenantId: string, actorId: string): Promise<{ ok: boolean }> {
    const workspaces = await this.prisma.workspace.findMany({
      where: { tenantId },
      select: { id: true }
    });
    const workspaceIds = workspaces.map((w) => w.id);

    await this.prisma.$transaction([
      this.prisma.timeLog.deleteMany({
        where: { task: { project: { workspaceId: { in: workspaceIds } } } }
      }),
      this.prisma.task.deleteMany({
        where: { project: { workspaceId: { in: workspaceIds } } }
      }),
      this.prisma.project.deleteMany({
        where: { workspaceId: { in: workspaceIds } }
      }),
      this.prisma.workspaceMember.deleteMany({
        where: { workspaceId: { in: workspaceIds } }
      }),
      this.prisma.workspace.deleteMany({
        where: { tenantId }
      }),
      this.prisma.tenantMember.deleteMany({
        where: { tenantId }
      }),
      this.prisma.tenantSubscription.deleteMany({
        where: { tenantId }
      }),
      this.prisma.tenant.delete({
        where: { id: tenantId }
      })
    ]);

    await this.logAudit(actorId, "tenant.gdpr_delete", tenantId, {});
    return { ok: true };
  }
}
