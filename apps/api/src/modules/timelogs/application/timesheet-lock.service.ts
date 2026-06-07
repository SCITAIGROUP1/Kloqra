import { ErrorCodes } from "@chronomint/contracts";
import { Injectable, HttpStatus } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  getPeriodRange,
  parseWorkspaceSettingsFromRaw,
  resolveApprovalPeriod
} from "../../../common/time/approval-period.util";

@Injectable()
export class TimesheetLockService {
  constructor(private prisma: PrismaService) {}

  async isApprovalEnabled(projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { timesheetApprovalEnabled: true }
    });
    return project?.timesheetApprovalEnabled ?? false;
  }

  private async loadProjectContext(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
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

  async getPeriodStatus(userId: string, projectId: string, entryStart: Date) {
    const enabled = await this.isApprovalEnabled(projectId);
    if (!enabled) return "DRAFT" as const;

    const { workspaceSettings, approvalPeriod } = await this.loadProjectContext(projectId);
    const { periodStart } = getPeriodRange(entryStart, approvalPeriod, workspaceSettings);

    const period = await this.prisma.timesheetPeriod.findUnique({
      where: {
        userId_projectId_periodStart: {
          userId,
          projectId,
          periodStart
        }
      }
    });

    return (period?.status ?? "DRAFT") as "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  }

  async assertPeriodEditable(userId: string, projectId: string, entryStart: Date) {
    const enabled = await this.isApprovalEnabled(projectId);
    if (!enabled) return;

    const status = await this.getPeriodStatus(userId, projectId, entryStart);
    if (status === "SUBMITTED" || status === "APPROVED") {
      throw new DomainException(
        ErrorCodes.TIMELOG_NOT_EDITABLE,
        "This timesheet period is locked (submitted or approved)",
        HttpStatus.FORBIDDEN
      );
    }
  }

  async assertTaskPeriodEditable(userId: string, taskId: string, entryStart: Date) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true }
    });
    if (!task) {
      throw new DomainException(ErrorCodes.NOT_FOUND, "Task not found", HttpStatus.NOT_FOUND);
    }
    await this.assertPeriodEditable(userId, task.projectId, entryStart);
  }
}
