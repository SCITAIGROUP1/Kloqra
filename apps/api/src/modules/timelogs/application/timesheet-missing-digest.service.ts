import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";
import { NotificationsDispatchService } from "../../notifications/application/notifications-dispatch.service";
import { TimesheetsService } from "./timesheets.service";

@Injectable()
export class TimesheetMissingDigestService {
  private readonly logger = new Logger(TimesheetMissingDigestService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private timesheets: TimesheetsService,
    private notificationsDispatch: NotificationsDispatchService
  ) {}

  @Cron("0 7 * * 1")
  async processWeeklyDigests(referenceDate = new Date()) {
    if (!process.env.DATABASE_URL?.trim()) {
      return;
    }

    const weekKey = isoWeekKey(referenceDate);
    const lockKey = `lock:timesheet-missing-digest:${weekKey}`;
    const lockAcquired = await this.redis.getClient().set(lockKey, "locked", "NX", "EX", 3600);
    if (!lockAcquired) {
      this.logger.log("Missing timesheet digest is locked by another instance or already run.");
      return;
    }

    const workspaces = await this.prisma.workspace.findMany({
      select: { id: true, name: true }
    });

    for (const workspace of workspaces) {
      const { items } = await this.timesheets.listMissing(
        workspace.id,
        referenceDate.toISOString()
      );
      if (items.length === 0) continue;

      const periodStart = items[0]!.periodStart;
      const periodLabel = items[0]!.periodLabel;

      const alreadySent = await this.prisma.notification.findFirst({
        where: {
          workspaceId: workspace.id,
          type: "TIMESHEET_MISSING_DIGEST",
          metadata: {
            path: ["periodStart"],
            equals: periodStart
          }
        },
        select: { id: true }
      });
      if (alreadySent) continue;

      void this.notificationsDispatch
        .notifyWorkspaceAdmins(workspace.id, {
          templateId: "timesheet.missing.digest",
          context: {
            workspaceName: workspace.name,
            missingCount: items.length,
            periodLabel,
            periodStart
          }
        })
        .catch((err: unknown) => {
          this.logger.error(
            `Notification dispatch failed: ${err instanceof Error ? err.message : String(err)}`
          );
        });
    }
  }
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
