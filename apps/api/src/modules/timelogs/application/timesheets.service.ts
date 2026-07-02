import { ErrorCodes, formatTimesheetPeriodLabel } from "@kloqra/contracts";
import type {
  MissingTimesheetDto,
  SubmitTimesheetResponseDto,
  TimesheetApprovalsFilterQuery,
  TimesheetPeriodDto,
  TimesheetSubmitPreviewDto
} from "@kloqra/contracts";
import { Injectable, HttpStatus, Logger } from "@nestjs/common";
import { ProjectAccessService } from "../../../common/access/project-access.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  getPeriodRange,
  parseWorkspaceSettingsFromRaw,
  resolveApprovalPeriod
} from "../../../common/time/approval-period.util";
import {
  enumeratePeriodAnchors,
  isPeriodWithinApprovalPolicy,
  resolveApprovalEffectiveStart,
  resolveStoredApprovalPeriod,
  sumHoursInPeriod
} from "../../../common/time/timesheet-approval-policy.util";
import {
  buildPeriodStartRange,
  matchesPeriodStartFilter
} from "../../../common/time/timesheet-approvals-filter.util";
import {
  assertNoPendingAmendment,
  buildCascadePlan,
  type CascadePeriodPreview
} from "../../../common/time/timesheet-cascade.util";
import { NotificationsDispatchService } from "../../notifications/application/notifications-dispatch.service";

@Injectable()
export class TimesheetsService {
  private readonly logger = new Logger(TimesheetsService.name);
  constructor(
    private prisma: PrismaService,
    private notificationsDispatch: NotificationsDispatchService,
    private access: ProjectAccessService
  ) {}

  private async amendmentPendingForPeriod(periodId: string | undefined): Promise<boolean> {
    if (!periodId) return false;
    const row = await this.prisma.timesheetAmendmentRequest.findFirst({
      where: { periodId, status: "PENDING" },
      select: { id: true }
    });
    return Boolean(row);
  }

  private toPeriodDto(
    period: {
      id: string;
      userId: string;
      workspaceId: string;
      projectId: string;
      periodStart: Date;
      periodEnd: Date;
      status: string;
      note: string | null;
      reviewNote: string | null;
      reviewedBy: string | null;
      submittedAt: Date | null;
      reviewedAt: Date | null;
      approvalPeriod?: string | null;
    },
    projectName: string,
    fallbackApprovalPeriod: "daily" | "weekly" | "monthly",
    amendmentPending?: boolean
  ): TimesheetPeriodDto {
    const approvalPeriod = resolveStoredApprovalPeriod(
      period.approvalPeriod,
      fallbackApprovalPeriod
    );
    return {
      id: period.id,
      userId: period.userId,
      workspaceId: period.workspaceId,
      projectId: period.projectId,
      projectName,
      periodStart: period.periodStart.toISOString(),
      periodEnd: period.periodEnd.toISOString(),
      approvalPeriod,
      status: period.status as TimesheetPeriodDto["status"],
      note: period.note,
      reviewNote: period.reviewNote,
      reviewedBy: period.reviewedBy,
      submittedAt: period.submittedAt?.toISOString() ?? null,
      reviewedAt: period.reviewedAt?.toISOString() ?? null,
      amendmentPending
    };
  }

  private virtualDraft(
    userId: string,
    workspaceId: string,
    projectId: string,
    projectName: string,
    periodStart: Date,
    periodEnd: Date,
    approvalPeriod: "daily" | "weekly" | "monthly"
  ): TimesheetPeriodDto {
    return {
      id: "",
      userId,
      workspaceId,
      projectId,
      projectName,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      approvalPeriod,
      status: "DRAFT",
      note: null,
      reviewNote: null,
      reviewedBy: null,
      submittedAt: null,
      reviewedAt: null,
      amendmentPending: false
    };
  }

  private async loadProject(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      include: { workspace: { select: { name: true, settings: true } } }
    });
    if (!project) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    }
    const workspaceSettings = parseWorkspaceSettingsFromRaw(project.workspace.settings);
    const approvalPeriod = resolveApprovalPeriod(
      project.timesheetApprovalPeriod,
      workspaceSettings
    );
    return { project, workspaceSettings, approvalPeriod, workspaceName: project.workspace.name };
  }

  private async dispatchNotification(work: Promise<void>) {
    try {
      await work;
    } catch (err: unknown) {
      this.logger.error(
        `Notification dispatch failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  private cascadePreviewToDto(row: CascadePeriodPreview) {
    return {
      periodStart: row.periodStart.toISOString(),
      periodEnd: row.periodEnd.toISOString(),
      approvalPeriod: row.approvalPeriod,
      periodLabel: row.periodLabel,
      totalHours: row.totalHours
    };
  }

  async getStatus(workspaceId: string, userId: string, projectId: string, dateStr: string) {
    const { project, workspaceSettings, approvalPeriod } = await this.loadProject(
      workspaceId,
      projectId
    );
    const { periodStart, periodEnd } = getPeriodRange(dateStr, approvalPeriod, workspaceSettings);

    const period = await this.prisma.timesheetPeriod.findUnique({
      where: {
        userId_projectId_periodStart: {
          userId,
          projectId,
          periodStart
        }
      }
    });

    if (!period || period.status === "WAIVED") {
      return this.virtualDraft(
        userId,
        workspaceId,
        projectId,
        project.name,
        periodStart,
        periodEnd,
        approvalPeriod
      );
    }

    const amendmentPending = await this.amendmentPendingForPeriod(period.id);
    return this.toPeriodDto(period, project.name, approvalPeriod, amendmentPending);
  }

  private async resolveSubmissionProjectIds(
    workspaceId: string,
    userId: string,
    scope: "logged" | "assigned"
  ): Promise<string[]> {
    if (scope === "assigned") {
      const memberships = await this.prisma.teamMember.findMany({
        where: {
          userId,
          isActive: true,
          team: {
            project: {
              workspaceId,
              timesheetApprovalEnabled: true,
              isActive: true
            }
          }
        },
        select: { team: { select: { projectId: true } } }
      });
      return [...new Set(memberships.map((row) => row.team.projectId))];
    }

    const projectIds = await this.prisma.timeLog.findMany({
      where: {
        userId,
        task: { project: { workspaceId, timesheetApprovalEnabled: true } }
      },
      select: { task: { select: { projectId: true } } },
      distinct: ["taskId"]
    });
    return [...new Set(projectIds.map((row) => row.task.projectId))];
  }

  async listSubmissions(
    workspaceId: string,
    userId: string,
    dateStr: string,
    scope: "logged" | "assigned" = "logged",
    lookbackWeeks = 26
  ) {
    const anchorDate = new Date(dateStr || Date.now());
    const uniqueProjectIds = await this.resolveSubmissionProjectIds(workspaceId, userId, scope);
    if (uniqueProjectIds.length === 0) return { items: [] };

    const lookbackStart = new Date(anchorDate);
    lookbackStart.setDate(lookbackStart.getDate() - lookbackWeeks * 7);

    const projects = await this.prisma.project.findMany({
      where: {
        id: { in: uniqueProjectIds },
        workspaceId,
        timesheetApprovalEnabled: true
      },
      include: { workspace: { select: { settings: true } } }
    });

    const dbPeriods = await this.prisma.timesheetPeriod.findMany({
      where: {
        userId,
        workspaceId,
        projectId: { in: uniqueProjectIds },
        status: { not: "WAIVED" },
        periodStart: { gte: lookbackStart }
      }
    });
    const dbByKey = new Map(
      dbPeriods.map((period) => [`${period.projectId}:${period.periodStart.getTime()}`, period])
    );

    const items: TimesheetPeriodDto[] = [];

    for (const project of projects) {
      const workspaceSettings = parseWorkspaceSettingsFromRaw(project.workspace.settings);
      const approvalPeriod = resolveApprovalPeriod(
        project.timesheetApprovalPeriod,
        workspaceSettings
      );
      const policyStart = resolveApprovalEffectiveStart(project);
      const scanFrom =
        lookbackStart.getTime() > policyStart.getTime() ? lookbackStart : policyStart;

      const anchors = enumeratePeriodAnchors(
        scanFrom,
        anchorDate,
        approvalPeriod,
        workspaceSettings
      );
      const handledKeys = new Set<string>();

      const logs = await this.prisma.timeLog.findMany({
        where: {
          userId,
          task: { projectId: project.id },
          startTime: { gte: scanFrom, lte: anchorDate }
        },
        select: { startTime: true, durationSec: true }
      });

      for (const anchor of anchors) {
        const { periodStart, periodEnd } = getPeriodRange(
          anchor,
          approvalPeriod,
          workspaceSettings
        );
        if (!isPeriodWithinApprovalPolicy(periodEnd, project)) continue;

        const key = `${project.id}:${periodStart.getTime()}`;
        handledKeys.add(key);
        const period = dbByKey.get(key);

        if (period) {
          if (period.status === "DRAFT") {
            const totalHours = sumHoursInPeriod(logs, periodStart, periodEnd);
            if (totalHours <= 0) continue;
          }
          const amendmentPending = await this.amendmentPendingForPeriod(period.id);
          items.push(this.toPeriodDto(period, project.name, approvalPeriod, amendmentPending));
          continue;
        }

        const totalHours = sumHoursInPeriod(logs, periodStart, periodEnd);
        if (totalHours <= 0) continue;
        items.push(
          this.virtualDraft(
            userId,
            workspaceId,
            project.id,
            project.name,
            periodStart,
            periodEnd,
            approvalPeriod
          )
        );
      }

      for (const period of dbPeriods.filter((row) => row.projectId === project.id)) {
        const key = `${project.id}:${period.periodStart.getTime()}`;
        if (handledKeys.has(key)) continue;
        if (period.status === "DRAFT") continue;
        if (!isPeriodWithinApprovalPolicy(period.periodEnd, project)) continue;
        const amendmentPending = await this.amendmentPendingForPeriod(period.id);
        items.push(this.toPeriodDto(period, project.name, approvalPeriod, amendmentPending));
      }
    }

    items.sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime());
    return { items };
  }

  async getSubmitPreview(
    workspaceId: string,
    userId: string,
    projectId: string,
    dateStr: string
  ): Promise<TimesheetSubmitPreviewDto> {
    const { project, workspaceSettings, approvalPeriod } = await this.loadProject(
      workspaceId,
      projectId
    );

    if (!project.timesheetApprovalEnabled) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Timesheet approval is not enabled for this project",
        HttpStatus.BAD_REQUEST
      );
    }

    const plan = await buildCascadePlan(
      this.prisma,
      userId,
      projectId,
      dateStr,
      approvalPeriod,
      workspaceSettings
    );

    const targetStatus = await this.getStatus(workspaceId, userId, projectId, dateStr);

    return {
      targetPeriod: targetStatus,
      cascadedPeriods: plan.cascaded.map((c) => this.cascadePreviewToDto(c)),
      blockedReason: plan.blockedReason,
      blockedPeriodLabel: plan.blockedPeriodLabel
    };
  }

  async submit(
    workspaceId: string,
    userId: string,
    projectId: string,
    dateStr: string,
    note?: string,
    _confirmCascade?: boolean
  ): Promise<SubmitTimesheetResponseDto> {
    const { project, workspaceSettings, approvalPeriod, workspaceName } = await this.loadProject(
      workspaceId,
      projectId
    );

    if (!project.timesheetApprovalEnabled) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Timesheet approval is not enabled for this project",
        HttpStatus.BAD_REQUEST
      );
    }

    const plan = await buildCascadePlan(
      this.prisma,
      userId,
      projectId,
      dateStr,
      approvalPeriod,
      workspaceSettings
    );

    if (plan.blockedReason) {
      throw new DomainException(
        ErrorCodes.TIMESHEET_BLOCKED_BY_REJECTED,
        plan.blockedReason,
        HttpStatus.FORBIDDEN
      );
    }

    const { periodStart, periodEnd } = plan.target;

    if (!isPeriodWithinApprovalPolicy(periodEnd, project)) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Timesheet approval does not apply to this period",
        HttpStatus.BAD_REQUEST
      );
    }

    const existingTarget = await this.prisma.timesheetPeriod.findUnique({
      where: {
        userId_projectId_periodStart: { userId, projectId, periodStart }
      }
    });

    if (existingTarget?.status === "APPROVED") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Cannot submit a timesheet that has already been approved",
        HttpStatus.FORBIDDEN
      );
    }

    if (existingTarget?.status === "SUBMITTED") {
      throw new DomainException(
        ErrorCodes.TIMESHEET_INVALID_STATUS,
        "Timesheet is already submitted",
        HttpStatus.CONFLICT
      );
    }

    const submittedAt = new Date();

    const saved = await this.prisma.$transaction(async (tx) => {
      if (existingTarget?.id) await assertNoPendingAmendment(this.prisma, [existingTarget.id]);

      const targetRow = existingTarget
        ? await tx.timesheetPeriod.update({
            where: { id: existingTarget.id },
            data: {
              status: "SUBMITTED",
              note: note || null,
              reviewNote: null,
              reviewedBy: null,
              submittedAt,
              reviewedAt: null,
              approvalPeriod
            }
          })
        : await tx.timesheetPeriod.create({
            data: {
              userId,
              workspaceId,
              projectId,
              periodStart,
              periodEnd,
              status: "SUBMITTED",
              note: note || null,
              submittedAt,
              approvalPeriod
            }
          });

      return targetRow;
    });

    const submitter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });
    const periodLabel = formatTimesheetPeriodLabel(saved.periodStart, approvalPeriod);
    const totalHours = await this.prisma.timeLog.aggregate({
      where: {
        userId,
        task: { projectId },
        startTime: { gte: saved.periodStart, lte: saved.periodEnd }
      },
      _sum: { durationSec: true }
    });

    const templateId = "timesheet.submitted";
    const submittedHours = (totalHours._sum?.durationSec ?? 0) / 3600;
    await this.dispatchNotification(
      this.notificationsDispatch.notifyWorkspaceAdmins(workspaceId, {
        templateId,
        context: {
          submitterName: submitter?.name ?? "A member",
          workspaceName,
          projectName: project.name,
          periodLabel,
          periodId: saved.id,
          projectId,
          periodStart: saved.periodStart.toISOString(),
          ...(submittedHours > 0 ? { totalHours: submittedHours } : {})
        }
      })
    );

    return {
      period: this.toPeriodDto(saved, project.name, approvalPeriod, false),
      cascadedPeriodIds: [],
      cascadedCount: 0
    };
  }

  async listPending(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    filter: TimesheetApprovalsFilterQuery = {}
  ) {
    return this.listReviewed(workspaceId, "SUBMITTED", filter, userId, role);
  }

  async listApproved(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    filter: TimesheetApprovalsFilterQuery = {}
  ) {
    return this.listReviewed(workspaceId, "APPROVED", filter, userId, role);
  }

  async listRejected(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    filter: TimesheetApprovalsFilterQuery = {}
  ) {
    return this.listReviewed(workspaceId, "REJECTED", filter, userId, role);
  }

  private async listReviewed(
    workspaceId: string,
    status: "SUBMITTED" | "APPROVED" | "REJECTED",
    filter: TimesheetApprovalsFilterQuery = {},
    userId?: string,
    role?: "ADMIN" | "MEMBER"
  ) {
    const managedProjectIds =
      userId && role && role !== "ADMIN"
        ? await this.access.manageableProjectIds(workspaceId, userId, role)
        : undefined;
    const periodStartRange = buildPeriodStartRange(filter);
    const periods = await this.prisma.timesheetPeriod.findMany({
      where: {
        workspaceId,
        status,
        ...(managedProjectIds ? { projectId: { in: managedProjectIds } } : {}),
        ...(filter.projectId
          ? Array.isArray(filter.projectId)
            ? { projectId: { in: filter.projectId } }
            : { projectId: filter.projectId }
          : {}),
        ...(filter.userId
          ? Array.isArray(filter.userId)
            ? { userId: { in: filter.userId } }
            : { userId: filter.userId }
          : {}),
        ...(periodStartRange ? { periodStart: periodStartRange } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          include: { workspace: { select: { settings: true } } }
        },
        amendments: {
          where: { status: "PENDING" },
          select: { id: true }
        }
      },
      orderBy:
        status === "SUBMITTED" ? { submittedAt: filter.sortOrder ?? "asc" } : { reviewedAt: "desc" }
    });

    const batchCounts = new Map<string, number>();
    if (status === "SUBMITTED") {
      for (const p of periods) {
        if (!p.submittedAt) continue;
        const key = `${p.userId}:${p.projectId}:${p.submittedAt.toISOString()}`;
        batchCounts.set(key, (batchCounts.get(key) ?? 0) + 1);
      }
    }

    if (periods.length === 0) return { items: [] };

    const reviewerIds = [...new Set(periods.map((p) => p.reviewedBy).filter(Boolean))] as string[];
    const reviewers = await this.prisma.user.findMany({
      where: { id: { in: reviewerIds } },
      select: { id: true, name: true }
    });
    const reviewerMap = new Map(reviewers.map((r) => [r.id, r.name]));

    const projectIds = [...new Set(periods.map((p) => p.projectId))];
    const userIds = [...new Set(periods.map((p) => p.userId))];
    const minStart = new Date(Math.min(...periods.map((p) => p.periodStart.getTime())));
    const maxEnd = new Date(Math.max(...periods.map((p) => p.periodEnd.getTime())));

    const logs = await this.prisma.timeLog.findMany({
      where: {
        userId: { in: userIds },
        task: { projectId: { in: projectIds } },
        startTime: {
          gte: minStart,
          lte: maxEnd
        }
      },
      select: {
        userId: true,
        durationSec: true,
        startTime: true,
        task: { select: { projectId: true } }
      }
    });

    const items = periods.map((p) => {
      const workspaceSettings = parseWorkspaceSettingsFromRaw(p.project.workspace.settings);
      const approvalPeriod = resolveApprovalPeriod(
        p.project.timesheetApprovalPeriod,
        workspaceSettings
      );

      const totalDuration = logs
        .filter(
          (l) =>
            l.userId === p.userId &&
            l.task.projectId === p.projectId &&
            l.startTime >= p.periodStart &&
            l.startTime <= p.periodEnd
        )
        .reduce((sum, l) => sum + l.durationSec, 0);

      const batchKey = p.submittedAt
        ? `${p.userId}:${p.projectId}:${p.submittedAt.toISOString()}`
        : "";
      const cascadedCount = batchKey ? (batchCounts.get(batchKey) ?? 1) : 1;

      const totalHours = totalDuration / 3600;
      const base = {
        id: p.id,
        userId: p.userId,
        userName: p.user.name,
        userEmail: p.user.email,
        projectId: p.projectId,
        projectName: p.project.name,
        periodStart: p.periodStart.toISOString(),
        periodEnd: p.periodEnd.toISOString(),
        approvalPeriod,
        note: p.note,
        totalHours: Math.round(totalHours * 100) / 100,
        cascadedCount: cascadedCount > 1 ? cascadedCount : undefined,
        amendmentPending: p.amendments.length > 0,
        submittedAt: p.submittedAt?.toISOString() ?? null
      };

      if (status === "SUBMITTED") {
        return base;
      }

      return {
        ...base,
        status,
        reviewNote: p.reviewNote,
        reviewedAt: p.reviewedAt?.toISOString() ?? new Date(0).toISOString(),
        reviewedBy: p.reviewedBy,
        reviewedByName: p.reviewedBy ? (reviewerMap.get(p.reviewedBy) ?? null) : null
      };
    });

    return { items };
  }

  async listMissing(
    workspaceId: string,
    dateStr: string,
    filter: TimesheetApprovalsFilterQuery = {}
  ) {
    const date = dateStr || new Date().toISOString();
    const projects = await this.prisma.project.findMany({
      where: {
        workspaceId,
        timesheetApprovalEnabled: true,
        isActive: true,
        ...(filter.projectId
          ? Array.isArray(filter.projectId)
            ? { id: { in: filter.projectId } }
            : { id: filter.projectId }
          : {})
      },
      include: { workspace: { select: { settings: true } } }
    });

    const items: MissingTimesheetDto[] = [];

    for (const project of projects) {
      const workspaceSettings = parseWorkspaceSettingsFromRaw(project.workspace.settings);
      const approvalPeriod = resolveApprovalPeriod(
        project.timesheetApprovalPeriod,
        workspaceSettings
      );
      const { periodStart, periodEnd } = getPeriodRange(date, approvalPeriod, workspaceSettings);
      const periodLabel = formatTimesheetPeriodLabel(periodStart, approvalPeriod);

      const members = await this.prisma.teamMember.findMany({
        where: { isActive: true, team: { projectId: project.id } },
        include: { user: { select: { id: true, name: true, email: true } } }
      });

      for (const member of members) {
        if (filter.userId) {
          const uIds = Array.isArray(filter.userId) ? filter.userId : [filter.userId];
          if (uIds.length > 0 && !uIds.includes(member.userId)) continue;
        }

        const period = await this.prisma.timesheetPeriod.findUnique({
          where: {
            userId_projectId_periodStart: {
              userId: member.userId,
              projectId: project.id,
              periodStart
            }
          }
        });
        const status = period?.status ?? "DRAFT";
        if (status === "SUBMITTED" || status === "APPROVED" || status === "WAIVED") continue;
        if (!isPeriodWithinApprovalPolicy(periodEnd, project)) continue;

        const aggregation = await this.prisma.timeLog.aggregate({
          where: {
            userId: member.userId,
            task: { projectId: project.id },
            startTime: { gte: periodStart, lte: periodEnd }
          },
          _sum: { durationSec: true }
        });
        const totalHours = Math.round(((aggregation._sum?.durationSec ?? 0) / 3600) * 100) / 100;
        if (totalHours <= 0) continue;

        const periodStartIso = periodStart.toISOString();
        if (!matchesPeriodStartFilter(periodStartIso, filter)) continue;

        const lastRemind = await this.prisma.notification.findFirst({
          where: {
            userId: member.userId,
            workspaceId,
            type: "TIMESHEET_REMINDER",
            metadata: {
              path: ["periodStart"],
              equals: periodStart.toISOString()
            }
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true }
        });

        items.push({
          userId: member.userId,
          userName: member.user.name,
          userEmail: member.user.email,
          projectId: project.id,
          projectName: project.name,
          periodStart: periodStartIso,
          periodEnd: periodEnd.toISOString(),
          approvalPeriod,
          periodLabel,
          totalHours,
          lastRemindedAt: lastRemind?.createdAt.toISOString() ?? null
        });
      }
    }

    return { items };
  }

  async remindMember(
    workspaceId: string,
    adminUserId: string,
    userId: string,
    projectId: string,
    dateStr: string,
    message?: string
  ) {
    const { project, workspaceSettings, approvalPeriod, workspaceName } = await this.loadProject(
      workspaceId,
      projectId
    );

    if (!project.timesheetApprovalEnabled) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Timesheet approval is not enabled for this project",
        HttpStatus.BAD_REQUEST
      );
    }

    const { periodStart, periodEnd } = getPeriodRange(dateStr, approvalPeriod, workspaceSettings);
    const periodLabel = formatTimesheetPeriodLabel(periodStart, approvalPeriod);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.prisma.notification.findFirst({
      where: {
        userId,
        workspaceId,
        type: "TIMESHEET_REMINDER",
        createdAt: { gte: since },
        metadata: {
          path: ["projectId"],
          equals: projectId
        }
      }
    });
    if (recent) {
      throw new DomainException(
        ErrorCodes.CONFLICT,
        "A reminder was already sent for this member and project in the last 24 hours",
        HttpStatus.CONFLICT
      );
    }

    await this.dispatchNotification(
      this.notificationsDispatch.notify({
        userId,
        workspaceId,
        templateId: "timesheet.reminder.manual",
        context: {
          workspaceName,
          projectName: project.name,
          projectId,
          periodLabel,
          periodStart: periodStart.toISOString(),
          dueLabel: periodEnd.toLocaleDateString("en-US"),
          adminMessage: message
        }
      })
    );

    return { ok: true as const, remindedBy: adminUserId };
  }

  private async assertReviewablePeriod(periodId: string, workspaceId: string) {
    const period = await this.prisma.timesheetPeriod.findFirst({
      where: { id: periodId, workspaceId },
      include: {
        amendments: { where: { status: "PENDING" }, select: { id: true } }
      }
    });
    if (!period) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Timesheet period not found",
        HttpStatus.NOT_FOUND
      );
    }
    if (period.status !== "SUBMITTED") {
      throw new DomainException(
        ErrorCodes.TIMESHEET_INVALID_STATUS,
        "Only submitted timesheets can be reviewed",
        HttpStatus.CONFLICT
      );
    }
    if (period.amendments.length > 0) {
      throw new DomainException(
        ErrorCodes.TIMESHEET_AMENDMENT_PENDING,
        "Resolve the pending edit request before reviewing",
        HttpStatus.CONFLICT
      );
    }
    return period;
  }

  async approve(
    workspaceId: string,
    id: string,
    reviewerUserId: string,
    reviewerRole: "ADMIN" | "MEMBER",
    reviewNote?: string
  ) {
    const existing = await this.prisma.timesheetPeriod.findFirst({
      where: { id, workspaceId },
      select: { projectId: true }
    });
    if (!existing) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Timesheet period not found",
        HttpStatus.NOT_FOUND
      );
    }
    await this.access.assertCanManageProject(
      workspaceId,
      reviewerUserId,
      reviewerRole,
      existing.projectId
    );

    const period = await this.prisma.$transaction(async (tx) => {
      const p = await tx.timesheetPeriod.findFirst({
        where: { id, workspaceId },
        include: {
          amendments: { where: { status: "PENDING" }, select: { id: true } }
        }
      });
      if (!p) {
        throw new DomainException(
          ErrorCodes.NOT_FOUND,
          "Timesheet period not found",
          HttpStatus.NOT_FOUND
        );
      }
      if (p.status !== "SUBMITTED") {
        throw new DomainException(
          ErrorCodes.TIMESHEET_INVALID_STATUS,
          "Only submitted timesheets can be reviewed",
          HttpStatus.CONFLICT
        );
      }
      if (p.amendments.length > 0) {
        throw new DomainException(
          ErrorCodes.TIMESHEET_AMENDMENT_PENDING,
          "Resolve the pending edit request before reviewing",
          HttpStatus.CONFLICT
        );
      }

      await tx.timesheetPeriod.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewNote: reviewNote || null,
          reviewedBy: reviewerUserId,
          reviewedAt: new Date()
        }
      });

      return p;
    });

    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: period.projectId },
      include: { workspace: { select: { name: true, settings: true } } }
    });
    const workspaceSettings = parseWorkspaceSettingsFromRaw(project.workspace.settings);
    const approvalPeriod = resolveApprovalPeriod(
      project.timesheetApprovalPeriod,
      workspaceSettings
    );
    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerUserId },
      select: { name: true }
    });

    const totalHoursAggregation = await this.prisma.timeLog.aggregate({
      where: {
        userId: period.userId,
        task: { projectId: period.projectId },
        startTime: { gte: period.periodStart, lte: period.periodEnd }
      },
      _sum: { durationSec: true }
    });
    const totalHours =
      Math.round(((totalHoursAggregation._sum?.durationSec ?? 0) / 3600) * 100) / 100;

    await this.dispatchNotification(
      this.notificationsDispatch.notify({
        userId: period.userId,
        workspaceId,
        templateId: "timesheet.approved",
        context: {
          workspaceName: project.workspace.name,
          projectName: project.name,
          periodLabel: formatTimesheetPeriodLabel(period.periodStart, approvalPeriod),
          periodId: id,
          projectId: period.projectId,
          periodStart: period.periodStart.toISOString(),
          reviewerName: reviewer?.name,
          ...(totalHours > 0 ? { totalHours } : {})
        }
      })
    );

    return { ok: true as const };
  }

  async reject(
    workspaceId: string,
    id: string,
    reviewerUserId: string,
    reviewerRole: "ADMIN" | "MEMBER",
    reviewNote?: string
  ) {
    if (!reviewNote?.trim()) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "A review note is required when rejecting a timesheet",
        HttpStatus.BAD_REQUEST
      );
    }

    const existing = await this.prisma.timesheetPeriod.findFirst({
      where: { id, workspaceId },
      select: { projectId: true }
    });
    if (!existing) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Timesheet period not found",
        HttpStatus.NOT_FOUND
      );
    }
    await this.access.assertCanManageProject(
      workspaceId,
      reviewerUserId,
      reviewerRole,
      existing.projectId
    );

    const period = await this.prisma.$transaction(async (tx) => {
      const p = await tx.timesheetPeriod.findFirst({
        where: { id, workspaceId },
        include: {
          amendments: { where: { status: "PENDING" }, select: { id: true } }
        }
      });
      if (!p) {
        throw new DomainException(
          ErrorCodes.NOT_FOUND,
          "Timesheet period not found",
          HttpStatus.NOT_FOUND
        );
      }
      if (p.status !== "SUBMITTED") {
        throw new DomainException(
          ErrorCodes.TIMESHEET_INVALID_STATUS,
          "Only submitted timesheets can be reviewed",
          HttpStatus.CONFLICT
        );
      }
      if (p.amendments.length > 0) {
        throw new DomainException(
          ErrorCodes.TIMESHEET_AMENDMENT_PENDING,
          "Resolve the pending edit request before reviewing",
          HttpStatus.CONFLICT
        );
      }

      await tx.timesheetPeriod.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewNote: reviewNote || null,
          reviewedBy: reviewerUserId,
          reviewedAt: new Date()
        }
      });

      return p;
    });

    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: period.projectId },
      include: { workspace: { select: { name: true, settings: true } } }
    });
    const workspaceSettings = parseWorkspaceSettingsFromRaw(project.workspace.settings);
    const approvalPeriod = resolveApprovalPeriod(
      project.timesheetApprovalPeriod,
      workspaceSettings
    );
    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerUserId },
      select: { name: true }
    });

    const totalHoursAggregation = await this.prisma.timeLog.aggregate({
      where: {
        userId: period.userId,
        task: { projectId: period.projectId },
        startTime: { gte: period.periodStart, lte: period.periodEnd }
      },
      _sum: { durationSec: true }
    });
    const totalHours =
      Math.round(((totalHoursAggregation._sum?.durationSec ?? 0) / 3600) * 100) / 100;

    await this.dispatchNotification(
      this.notificationsDispatch.notify({
        userId: period.userId,
        workspaceId,
        templateId: "timesheet.rejected",
        context: {
          workspaceName: project.workspace.name,
          projectName: project.name,
          periodLabel: formatTimesheetPeriodLabel(period.periodStart, approvalPeriod),
          periodId: id,
          projectId: period.projectId,
          periodStart: period.periodStart.toISOString(),
          reviewerName: reviewer?.name,
          reviewNote: reviewNote || undefined,
          ...(totalHours > 0 ? { totalHours } : {})
        }
      })
    );

    return { ok: true as const };
  }
}
