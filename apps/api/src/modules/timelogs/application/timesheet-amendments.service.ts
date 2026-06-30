import { ErrorCodes, formatTimesheetPeriodLabel } from "@kloqra/contracts";
import type { TimesheetAmendmentDto, TimesheetApprovalsFilterQuery } from "@kloqra/contracts";
import { Injectable, HttpStatus, Logger } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  parseWorkspaceSettingsFromRaw,
  resolveApprovalPeriod
} from "../../../common/time/approval-period.util";
import { buildPeriodStartRange } from "../../../common/time/timesheet-approvals-filter.util";
import { NotificationsDispatchService } from "../../notifications/application/notifications-dispatch.service";

@Injectable()
export class TimesheetAmendmentsService {
  private readonly logger = new Logger(TimesheetAmendmentsService.name);
  constructor(
    private prisma: PrismaService,
    private notificationsDispatch: NotificationsDispatchService
  ) {}

  private toDto(row: {
    id: string;
    periodId: string;
    userId: string;
    workspaceId: string;
    reason: string;
    status: string;
    adminNote: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    user: { name: string; email: string };
    period: {
      projectId: string;
      periodStart: Date;
      periodEnd: Date;
      project: {
        name: string;
        timesheetApprovalPeriod: string | null;
        workspace: { name: string; settings: unknown };
      };
    };
  }): TimesheetAmendmentDto {
    const workspaceSettings = parseWorkspaceSettingsFromRaw(row.period.project.workspace.settings);
    const approvalPeriod = resolveApprovalPeriod(
      row.period.project.timesheetApprovalPeriod,
      workspaceSettings
    );
    return {
      id: row.id,
      periodId: row.periodId,
      userId: row.userId,
      userName: row.user.name,
      userEmail: row.user.email,
      workspaceId: row.workspaceId,
      projectId: row.period.projectId,
      projectName: row.period.project.name,
      periodStart: row.period.periodStart.toISOString(),
      periodEnd: row.period.periodEnd.toISOString(),
      periodLabel: formatTimesheetPeriodLabel(row.period.periodStart, approvalPeriod),
      reason: row.reason,
      status: row.status as TimesheetAmendmentDto["status"],
      adminNote: row.adminNote,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString()
    };
  }

  async create(workspaceId: string, userId: string, periodId: string, reason: string) {
    const period = await this.prisma.timesheetPeriod.findFirst({
      where: { id: periodId, workspaceId, userId },
      include: {
        project: { include: { workspace: { select: { name: true, settings: true } } } }
      }
    });

    if (!period) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Timesheet period not found",
        HttpStatus.NOT_FOUND
      );
    }

    if (period.status !== "SUBMITTED" && period.status !== "APPROVED") {
      throw new DomainException(
        ErrorCodes.TIMESHEET_INVALID_STATUS,
        "Edit requests are only allowed for submitted or approved periods",
        HttpStatus.BAD_REQUEST
      );
    }

    const existing = await this.prisma.timesheetAmendmentRequest.findFirst({
      where: { periodId, status: "PENDING" }
    });
    if (existing) {
      throw new DomainException(
        ErrorCodes.TIMESHEET_AMENDMENT_PENDING,
        "An edit request is already pending for this period",
        HttpStatus.CONFLICT
      );
    }

    const row = await this.prisma.timesheetAmendmentRequest.create({
      data: {
        periodId,
        userId,
        workspaceId,
        reason
      },
      include: {
        user: { select: { name: true, email: true } },
        period: {
          include: {
            project: {
              include: { workspace: { select: { name: true, settings: true } } }
            }
          }
        }
      }
    });

    const workspaceSettings = parseWorkspaceSettingsFromRaw(period.project.workspace.settings);
    const approvalPeriod = resolveApprovalPeriod(
      period.project.timesheetApprovalPeriod,
      workspaceSettings
    );

    void this.notificationsDispatch
      .notifyWorkspaceAdmins(workspaceId, {
        templateId: "timesheet.amendment.requested",
        context: {
          memberName: row.user.name,
          workspaceName: period.project.workspace.name,
          projectName: period.project.name,
          periodLabel: formatTimesheetPeriodLabel(period.periodStart, approvalPeriod),
          periodId,
          projectId: period.projectId,
          amendmentId: row.id,
          reason
        }
      })
      .catch((err: unknown) => {
        this.logger.error(
          `Notification dispatch failed: ${err instanceof Error ? err.message : String(err)}`
        );
      });

    return this.toDto(row);
  }

  async listPending(workspaceId: string, filter: TimesheetApprovalsFilterQuery = {}) {
    const periodStartRange = buildPeriodStartRange(filter);
    const periodWhere =
      filter.projectId || periodStartRange
        ? {
            ...(filter.projectId
              ? Array.isArray(filter.projectId)
                ? { projectId: { in: filter.projectId } }
                : { projectId: filter.projectId }
              : {}),
            ...(periodStartRange ? { periodStart: periodStartRange } : {})
          }
        : undefined;

    const rows = await this.prisma.timesheetAmendmentRequest.findMany({
      where: {
        workspaceId,
        status: "PENDING",
        ...(filter.userId
          ? Array.isArray(filter.userId)
            ? { userId: { in: filter.userId } }
            : { userId: filter.userId }
          : {}),
        ...(periodWhere ? { period: periodWhere } : {})
      },
      include: {
        user: { select: { name: true, email: true } },
        period: {
          include: {
            project: {
              include: { workspace: { select: { name: true, settings: true } } }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return { items: rows.map((row) => this.toDto(row)) };
  }

  async approve(workspaceId: string, amendmentId: string, adminUserId: string) {
    const amendment = await this.prisma.timesheetAmendmentRequest.findFirst({
      where: { id: amendmentId, workspaceId, status: "PENDING" },
      include: {
        user: { select: { name: true, email: true } },
        period: {
          include: {
            project: {
              include: { workspace: { select: { name: true, settings: true } } }
            }
          }
        }
      }
    });

    if (!amendment) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Amendment request not found",
        HttpStatus.NOT_FOUND
      );
    }

    if (amendment.period.status !== "SUBMITTED" && amendment.period.status !== "APPROVED") {
      throw new DomainException(
        ErrorCodes.TIMESHEET_INVALID_STATUS,
        "Period is no longer locked",
        HttpStatus.CONFLICT
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const updatedAmendment = await tx.timesheetAmendmentRequest.updateMany({
        where: { id: amendmentId, status: "PENDING" },
        data: {
          status: "APPROVED",
          reviewedBy: adminUserId,
          reviewedAt: new Date()
        }
      });
      if (updatedAmendment.count === 0) {
        throw new DomainException(
          ErrorCodes.CONFLICT,
          "Amendment request is no longer pending",
          HttpStatus.CONFLICT
        );
      }

      await tx.timesheetPeriod.update({
        where: { id: amendment.periodId },
        data: {
          status: "DRAFT",
          reviewNote: null,
          reviewedBy: null,
          reviewedAt: null,
          submittedAt: null
        }
      });
    });

    const workspaceSettings = parseWorkspaceSettingsFromRaw(
      amendment.period.project.workspace.settings
    );
    const approvalPeriod = resolveApprovalPeriod(
      amendment.period.project.timesheetApprovalPeriod,
      workspaceSettings
    );

    void this.notificationsDispatch
      .notify({
        userId: amendment.userId,
        workspaceId,
        templateId: "timesheet.amendment.approved",
        context: {
          workspaceName: amendment.period.project.workspace.name,
          projectName: amendment.period.project.name,
          periodLabel: formatTimesheetPeriodLabel(amendment.period.periodStart, approvalPeriod),
          periodId: amendment.periodId,
          projectId: amendment.period.projectId,
          periodStart: amendment.period.periodStart.toISOString()
        }
      })
      .catch((err: unknown) => {
        this.logger.error(
          `Notification dispatch failed: ${err instanceof Error ? err.message : String(err)}`
        );
      });

    const row = await this.prisma.timesheetAmendmentRequest.findUniqueOrThrow({
      where: { id: amendmentId },
      include: {
        user: { select: { name: true, email: true } },
        period: {
          include: {
            project: {
              include: { workspace: { select: { name: true, settings: true } } }
            }
          }
        }
      }
    });

    return this.toDto(row);
  }

  async deny(workspaceId: string, amendmentId: string, adminUserId: string, adminNote?: string) {
    if (!adminNote?.trim()) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Admin note is required when denying an edit request",
        HttpStatus.BAD_REQUEST
      );
    }

    // Non-critical but preferred: wrap the status update and detail fetch inside a single
    // transaction block to ensure atomicity and consistent database read states.
    const row = await this.prisma.$transaction(async (tx) => {
      const result = await tx.timesheetAmendmentRequest.updateMany({
        where: { id: amendmentId, workspaceId, status: "PENDING" },
        data: {
          status: "DENIED",
          adminNote: adminNote.trim(),
          reviewedBy: adminUserId,
          reviewedAt: new Date()
        }
      });

      if (result.count === 0) {
        throw new DomainException(
          ErrorCodes.NOT_FOUND,
          "Amendment request not found or already reviewed",
          HttpStatus.NOT_FOUND
        );
      }

      return tx.timesheetAmendmentRequest.findUniqueOrThrow({
        where: { id: amendmentId },
        include: {
          user: { select: { name: true, email: true } },
          period: {
            include: {
              project: {
                include: { workspace: { select: { name: true, settings: true } } }
              }
            }
          }
        }
      });
    });

    const workspaceSettings = parseWorkspaceSettingsFromRaw(row.period.project.workspace.settings);
    const approvalPeriod = resolveApprovalPeriod(
      row.period.project.timesheetApprovalPeriod,
      workspaceSettings
    );

    void this.notificationsDispatch
      .notify({
        userId: row.userId,
        workspaceId,
        templateId: "timesheet.amendment.denied",
        context: {
          workspaceName: row.period.project.workspace.name,
          projectName: row.period.project.name,
          periodLabel: formatTimesheetPeriodLabel(row.period.periodStart, approvalPeriod),
          periodId: row.periodId,
          projectId: row.period.projectId,
          periodStart: row.period.periodStart.toISOString(),
          adminNote: adminNote || undefined
        }
      })
      .catch((err: unknown) => {
        this.logger.error(
          `Notification dispatch failed: ${err instanceof Error ? err.message : String(err)}`
        );
      });

    return this.toDto(row);
  }
}
