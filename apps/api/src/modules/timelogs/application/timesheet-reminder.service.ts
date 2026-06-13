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

type ReminderTarget = {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  projectId: string;
  projectName: string;
  periodStart: Date;
  periodEnd: Date;
  approvalPeriod: TimesheetApprovalPeriod;
  timeZone: string;
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
        name: true,
        workspaceId: true,
        timesheetApprovalPeriod: true,
        workspace: { select: { name: true, settings: true } }
      }
    });

    for (const project of projects) {
      const settings = parseWorkspaceSettingsFromRaw(project.workspace.settings);
      const timeZone = settings.timezone?.trim() || "UTC";
      const approvalPeriod = resolveApprovalPeriod(project.timesheetApprovalPeriod, settings);
      const { periodStart, periodEnd } = getPeriodRange(referenceDate, approvalPeriod, settings);

      if (!isTimesheetReminderWindow(referenceDate, periodEnd, timeZone)) {
        continue;
      }

      const candidateUserIds = await this.collectCandidateUserIds(
        project.id,
        periodStart,
        periodEnd
      );

      for (const userId of candidateUserIds) {
        const needsReminder = await this.userNeedsReminder(userId, project.id, periodStart);
        if (!needsReminder) continue;

        const alreadySent = await this.prisma.notification.findFirst({
          where: {
            userId,
            workspaceId: project.workspaceId,
            type: "TIMESHEET_REMINDER",
            metadata: {
              path: ["projectId"],
              equals: project.id
            },
            AND: {
              metadata: {
                path: ["periodStart"],
                equals: periodStart.toISOString()
              }
            }
          },
          select: { id: true }
        });
        if (alreadySent) continue;

        await this.sendReminder({
          workspaceId: project.workspaceId,
          workspaceName: project.workspace.name,
          userId,
          projectId: project.id,
          projectName: project.name,
          periodStart,
          periodEnd,
          approvalPeriod,
          timeZone
        });
      }
    }
  }

  private async sendReminder(target: ReminderTarget) {
    const periodLabel = formatTimesheetPeriodLabel(target.periodStart, target.approvalPeriod);
    const dueLabel = formatReminderDueLabel(target.periodEnd, target.timeZone);

    void this.notificationsDispatch
      .notify({
        userId: target.userId,
        workspaceId: target.workspaceId,
        templateId: "timesheet.reminder",
        context: {
          workspaceName: target.workspaceName,
          projectName: target.projectName,
          projectId: target.projectId,
          periodLabel,
          dueLabel,
          periodStart: target.periodStart.toISOString()
        }
      })
      .catch(() => undefined);
  }

  private async collectCandidateUserIds(
    projectId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<string[]> {
    const [teamMembers, logUsers] = await Promise.all([
      this.prisma.teamMember.findMany({
        where: {
          isActive: true,
          team: { projectId }
        },
        select: { userId: true }
      }),
      this.prisma.timeLog.findMany({
        where: {
          task: { projectId },
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
    projectId: string,
    periodStart: Date
  ): Promise<boolean> {
    const period = await this.prisma.timesheetPeriod.findUnique({
      where: {
        userId_projectId_periodStart: { userId, projectId, periodStart }
      },
      select: { status: true }
    });

    return !period || period.status === "DRAFT" || period.status === "REJECTED";
  }
}
