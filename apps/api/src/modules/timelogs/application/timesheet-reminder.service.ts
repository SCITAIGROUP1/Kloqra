import { formatTimesheetPeriodLabel } from "@kloqra/contracts";
import type { TimesheetApprovalPeriod } from "@kloqra/contracts";
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  getPeriodRange,
  parseWorkspaceSettingsFromRaw,
  resolveApprovalPeriod
} from "../../../common/time/approval-period.util";
import {
  formatReminderDueLabel,
  isTimesheetReminderWindow
} from "../../../common/time/timesheet-reminder.util";
import { NotificationsDispatchService } from "../../notifications/application/notifications-dispatch.service";

const TICK_MS = 60_000;

type PeriodBucket = {
  workspaceId: string;
  periodStart: Date;
  periodEnd: Date;
  approvalPeriod: TimesheetApprovalPeriod;
  timeZone: string;
  projectIds: string[];
};

@Injectable()
export class TimesheetReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TimesheetReminderService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private notificationsDispatch: NotificationsDispatchService
  ) {}

  onModuleInit() {
    if (!process.env.DATABASE_URL?.trim()) {
      this.logger.warn("DATABASE_URL not set — timesheet reminder worker disabled.");
      return;
    }
    this.timer = setInterval(() => {
      void this.processDueReminders().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Timesheet reminder tick failed: ${message}`);
      });
    }, TICK_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async processDueReminders(referenceDate = new Date()) {
    const projects = await this.prisma.project.findMany({
      where: { timesheetApprovalEnabled: true, isActive: true },
      select: {
        id: true,
        workspaceId: true,
        timesheetApprovalPeriod: true,
        workspace: { select: { settings: true } }
      }
    });

    const buckets = new Map<string, PeriodBucket>();

    for (const project of projects) {
      const settings = parseWorkspaceSettingsFromRaw(project.workspace.settings);
      const timeZone = settings.timezone?.trim() || "UTC";
      const approvalPeriod = resolveApprovalPeriod(project.timesheetApprovalPeriod, settings);
      const { periodStart, periodEnd } = getPeriodRange(referenceDate, approvalPeriod, settings);

      if (!isTimesheetReminderWindow(referenceDate, periodEnd, timeZone)) {
        continue;
      }

      const key = `${project.workspaceId}:${periodStart.toISOString()}:${approvalPeriod}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.projectIds.push(project.id);
        continue;
      }

      buckets.set(key, {
        workspaceId: project.workspaceId,
        periodStart,
        periodEnd,
        approvalPeriod,
        timeZone,
        projectIds: [project.id]
      });
    }

    for (const bucket of buckets.values()) {
      await this.processBucket(bucket);
    }
  }

  private async processBucket(bucket: PeriodBucket) {
    const candidateUserIds = await this.collectCandidateUserIds(
      bucket.projectIds,
      bucket.periodStart,
      bucket.periodEnd
    );

    for (const userId of candidateUserIds) {
      const needsReminder = await this.userNeedsReminder(
        userId,
        bucket.projectIds,
        bucket.periodStart
      );
      if (!needsReminder) continue;

      const alreadySent = await this.prisma.notification.findFirst({
        where: {
          userId,
          workspaceId: bucket.workspaceId,
          type: "TIMESHEET_REMINDER",
          metadata: {
            path: ["periodStart"],
            equals: bucket.periodStart.toISOString()
          }
        },
        select: { id: true }
      });
      if (alreadySent) continue;

      const periodLabel = formatTimesheetPeriodLabel(bucket.periodStart, bucket.approvalPeriod);
      const dueLabel = formatReminderDueLabel(bucket.periodEnd, bucket.timeZone);

      void this.notificationsDispatch
        .notify({
          userId,
          workspaceId: bucket.workspaceId,
          templateId: "timesheet.reminder",
          context: {
            periodLabel,
            dueLabel,
            periodStart: bucket.periodStart.toISOString()
          }
        })
        .catch(() => undefined);
    }
  }

  private async collectCandidateUserIds(
    projectIds: string[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<string[]> {
    const [teamMembers, logUsers] = await Promise.all([
      this.prisma.teamMember.findMany({
        where: {
          isActive: true,
          team: { projectId: { in: projectIds } }
        },
        select: { userId: true }
      }),
      this.prisma.timeLog.findMany({
        where: {
          task: { projectId: { in: projectIds } },
          startTime: { gte: periodStart, lte: periodEnd }
        },
        select: { userId: true },
        distinct: ["userId"]
      })
    ]);

    return [
      ...new Set([...teamMembers.map((row) => row.userId), ...logUsers.map((row) => row.userId)])
    ];
  }

  private async userNeedsReminder(
    userId: string,
    projectIds: string[],
    periodStart: Date
  ): Promise<boolean> {
    for (const projectId of projectIds) {
      const period = await this.prisma.timesheetPeriod.findUnique({
        where: {
          userId_projectId_periodStart: { userId, projectId, periodStart }
        },
        select: { status: true }
      });

      if (!period || period.status === "DRAFT" || period.status === "REJECTED") {
        return true;
      }
    }

    return false;
  }
}
