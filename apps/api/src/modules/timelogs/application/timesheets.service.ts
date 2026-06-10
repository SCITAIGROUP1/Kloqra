import { ErrorCodes } from "@kloqra/contracts";
import type { TimesheetPeriodDto } from "@kloqra/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  getPeriodRange,
  parseWorkspaceSettingsFromRaw,
  resolveApprovalPeriod
} from "../../../common/time/approval-period.util";

@Injectable()
export class TimesheetsService {
  constructor(private prisma: PrismaService) {}

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
    },
    projectName: string,
    approvalPeriod: "daily" | "weekly" | "monthly"
  ): TimesheetPeriodDto {
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
      reviewedAt: period.reviewedAt?.toISOString() ?? null
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
      reviewedAt: null
    };
  }

  private async loadProject(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      include: { workspace: { select: { settings: true } } }
    });
    if (!project) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Project not found", HttpStatus.NOT_FOUND);
    }
    const workspaceSettings = parseWorkspaceSettingsFromRaw(project.workspace.settings);
    const approvalPeriod = resolveApprovalPeriod(
      project.timesheetApprovalPeriod,
      workspaceSettings
    );
    return { project, workspaceSettings, approvalPeriod };
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

    if (!period) {
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

    return this.toPeriodDto(period, project.name, approvalPeriod);
  }

  async listSubmissions(
    workspaceId: string,
    userId: string,
    dateStr: string,
    scope: "logged" | "assigned" = "logged"
  ) {
    const date = dateStr || new Date().toISOString();

    let uniqueProjectIds: string[];

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
      uniqueProjectIds = [...new Set(memberships.map((row) => row.team.projectId))];
    } else {
      const projectIds = await this.prisma.timeLog.findMany({
        where: {
          userId,
          task: { project: { workspaceId, timesheetApprovalEnabled: true } }
        },
        select: { task: { select: { projectId: true } } },
        distinct: ["taskId"]
      });
      uniqueProjectIds = [...new Set(projectIds.map((row) => row.task.projectId))];
    }

    const items: TimesheetPeriodDto[] = [];
    for (const projectId of uniqueProjectIds) {
      items.push(await this.getStatus(workspaceId, userId, projectId, date));
    }

    return { items };
  }

  async submit(
    workspaceId: string,
    userId: string,
    projectId: string,
    dateStr: string,
    note?: string
  ) {
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

    const { periodStart, periodEnd } = getPeriodRange(dateStr, approvalPeriod, workspaceSettings);

    const existing = await this.prisma.timesheetPeriod.findUnique({
      where: {
        userId_projectId_periodStart: {
          userId,
          projectId,
          periodStart
        }
      }
    });

    if (existing && existing.status === "APPROVED") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Cannot submit a timesheet that has already been approved",
        HttpStatus.FORBIDDEN
      );
    }

    const data = {
      userId,
      workspaceId,
      projectId,
      periodStart,
      periodEnd,
      status: "SUBMITTED",
      note: note || null,
      reviewNote: null,
      reviewedBy: null,
      submittedAt: new Date(),
      reviewedAt: null
    };

    const saved = existing
      ? await this.prisma.timesheetPeriod.update({ where: { id: existing.id }, data })
      : await this.prisma.timesheetPeriod.create({ data });

    return this.toPeriodDto(saved, project.name, approvalPeriod);
  }

  async listPending(workspaceId: string) {
    const periods = await this.prisma.timesheetPeriod.findMany({
      where: {
        workspaceId,
        status: "SUBMITTED"
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
        }
      },
      orderBy: {
        submittedAt: "desc"
      }
    });

    return Promise.all(
      periods.map(async (p) => {
        const workspaceSettings = parseWorkspaceSettingsFromRaw(p.project.workspace.settings);
        const approvalPeriod = resolveApprovalPeriod(
          p.project.timesheetApprovalPeriod,
          workspaceSettings
        );

        const aggregation = await this.prisma.timeLog.aggregate({
          where: {
            task: { projectId: p.projectId },
            userId: p.userId,
            startTime: {
              gte: p.periodStart,
              lte: p.periodEnd
            }
          },
          _sum: {
            durationSec: true
          }
        });

        const totalHours = (aggregation._sum?.durationSec ?? 0) / 3600;
        return {
          id: p.id,
          userId: p.userId,
          userName: p.user.name,
          userEmail: p.user.email,
          projectId: p.projectId,
          projectName: p.project.name,
          periodStart: p.periodStart.toISOString(),
          periodEnd: p.periodEnd.toISOString(),
          approvalPeriod,
          status: p.status as TimesheetPeriodDto["status"],
          note: p.note,
          submittedAt: p.submittedAt?.toISOString() ?? null,
          totalHours: Math.round(totalHours * 100) / 100
        };
      })
    );
  }

  async approve(workspaceId: string, id: string, adminUserId: string, reviewNote?: string) {
    const period = await this.prisma.timesheetPeriod.findFirst({
      where: { id, workspaceId }
    });

    if (!period) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Timesheet period not found",
        HttpStatus.NOT_FOUND
      );
    }

    return this.prisma.timesheetPeriod.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewNote: reviewNote || null,
        reviewedBy: adminUserId,
        reviewedAt: new Date()
      }
    });
  }

  async reject(workspaceId: string, id: string, adminUserId: string, reviewNote?: string) {
    const period = await this.prisma.timesheetPeriod.findFirst({
      where: { id, workspaceId }
    });

    if (!period) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Timesheet period not found",
        HttpStatus.NOT_FOUND
      );
    }

    return this.prisma.timesheetPeriod.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewNote: reviewNote || null,
        reviewedBy: adminUserId,
        reviewedAt: new Date()
      }
    });
  }
}
