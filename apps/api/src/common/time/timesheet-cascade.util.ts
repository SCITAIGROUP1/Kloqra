import { ErrorCodes, formatTimesheetPeriodLabel } from "@kloqra/contracts";
import type { TimesheetApprovalPeriod, WorkspaceSettings } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { DomainException } from "../errors/domain.exception";
import type { PrismaService } from "../prisma/prisma.service";
import { getPeriodRange, type PeriodRange } from "./approval-period.util";

export type CascadePeriodPreview = {
  periodStart: Date;
  periodEnd: Date;
  approvalPeriod: TimesheetApprovalPeriod;
  periodLabel: string;
  totalHours: number;
};

export type CascadePlan = {
  target: PeriodRange;
  cascaded: CascadePeriodPreview[];
  blockedReason?: string;
  blockedPeriodLabel?: string;
};

function periodKey(start: Date): string {
  return start.toISOString();
}

async function statusForPeriod(
  prisma: PrismaService,
  userId: string,
  projectId: string,
  periodStart: Date
): Promise<"DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED"> {
  const row = await prisma.timesheetPeriod.findUnique({
    where: {
      userId_projectId_periodStart: { userId, projectId, periodStart }
    },
    select: { status: true }
  });
  if (row?.status === "WAIVED") return "DRAFT";
  return (row?.status ?? "DRAFT") as "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
}

export async function buildCascadePlan(
  prisma: PrismaService,
  userId: string,
  projectId: string,
  dateStr: string,
  approvalPeriod: TimesheetApprovalPeriod,
  workspaceSettings: WorkspaceSettings
): Promise<CascadePlan> {
  const target = getPeriodRange(dateStr, approvalPeriod, workspaceSettings);

  const earliestLog = await prisma.timeLog.findFirst({
    where: { userId, task: { projectId } },
    orderBy: { startTime: "asc" },
    select: { startTime: true }
  });

  const cascaded: CascadePeriodPreview[] = [];
  let blockedReason: string | undefined;
  let blockedPeriodLabel: string | undefined;

  if (earliestLog) {
    const seen = new Set<string>();
    let cursor = new Date(target.periodStart.getTime() - 1);
    const earliestRange = getPeriodRange(earliestLog.startTime, approvalPeriod, workspaceSettings);

    for (let i = 0; i < 520; i++) {
      const range = getPeriodRange(cursor, approvalPeriod, workspaceSettings);
      if (range.periodStart >= target.periodStart) break;

      const key = periodKey(range.periodStart);
      if (seen.has(key)) break;
      seen.add(key);

      const status = await statusForPeriod(prisma, userId, projectId, range.periodStart);
      const label = formatTimesheetPeriodLabel(range.periodStart, approvalPeriod);

      if (status === "REJECTED") {
        blockedReason = `Resolve rejected period ${label} before submitting.`;
        blockedPeriodLabel = label;
        break;
      }

      cursor = new Date(range.periodStart.getTime() - 1);
      if (range.periodStart.getTime() <= earliestRange.periodStart.getTime()) break;
    }
  }

  return {
    target,
    cascaded,
    blockedReason,
    blockedPeriodLabel
  };
}

export async function assertNoPendingAmendment(
  prisma: PrismaService,
  periodIds: string[]
): Promise<void> {
  const ids = periodIds.filter(Boolean);
  if (ids.length === 0) return;
  const pending = await prisma.timesheetAmendmentRequest.findFirst({
    where: { periodId: { in: ids }, status: "PENDING" },
    select: { id: true }
  });
  if (pending) {
    throw new DomainException(
      ErrorCodes.TIMESHEET_AMENDMENT_PENDING,
      "An edit request is pending for this timesheet period",
      HttpStatus.CONFLICT
    );
  }
}
