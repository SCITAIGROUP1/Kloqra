import type { TimesheetApprovalPeriod, WorkspaceSettings } from "@kloqra/contracts";
import type { PrismaClient } from "@prisma/client";
import { getPeriodRange } from "./approval-period.util";

export type ProjectApprovalPolicyRow = {
  timesheetApprovalEnabledAt: Date | null;
  createdAt: Date;
};

/** First instant when approval policy applies to this project. */
export function resolveApprovalEffectiveStart(project: ProjectApprovalPolicyRow): Date {
  return project.timesheetApprovalEnabledAt ?? project.createdAt;
}

/** Period overlaps the approval policy window (not entirely before enablement). */
export function isPeriodWithinApprovalPolicy(
  periodEnd: Date,
  project: ProjectApprovalPolicyRow
): boolean {
  return periodEnd.getTime() >= resolveApprovalEffectiveStart(project).getTime();
}

export function resolveStoredApprovalPeriod(
  stored: string | null | undefined,
  fallback: TimesheetApprovalPeriod
): TimesheetApprovalPeriod {
  if (stored === "daily" || stored === "weekly" || stored === "monthly") {
    return stored;
  }
  return fallback;
}

export async function waiveOpenTimesheetPeriods(
  prisma: Pick<PrismaClient, "timesheetPeriod">,
  projectId: string
): Promise<number> {
  const result = await prisma.timesheetPeriod.updateMany({
    where: {
      projectId,
      status: { in: ["DRAFT", "REJECTED"] }
    },
    data: { status: "WAIVED" }
  });
  return result.count;
}

/** Walk backward from `toDate`, yielding anchor dates whose period ranges cover the lookback window. */
export function enumeratePeriodAnchors(
  fromDate: Date,
  toDate: Date,
  approvalPeriod: TimesheetApprovalPeriod,
  workspaceSettings: WorkspaceSettings
): Date[] {
  const floor = fromDate.getTime();
  const seenPeriodStarts = new Set<number>();
  const anchors: Date[] = [];
  let cursor = new Date(toDate);

  for (let i = 0; i < 104; i++) {
    const { periodStart } = getPeriodRange(cursor, approvalPeriod, workspaceSettings);
    const key = periodStart.getTime();
    if (key < floor) break;
    if (!seenPeriodStarts.has(key)) {
      seenPeriodStarts.add(key);
      anchors.push(new Date(cursor));
    }

    if (approvalPeriod === "daily") {
      cursor = new Date(cursor);
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else if (approvalPeriod === "monthly") {
      cursor = new Date(cursor);
      cursor.setUTCMonth(cursor.getUTCMonth() - 1);
    } else {
      cursor = new Date(cursor);
      cursor.setUTCDate(cursor.getUTCDate() - 7);
    }
  }

  return anchors;
}

export function sumHoursInPeriod(
  logs: { startTime: Date; durationSec: number }[],
  periodStart: Date,
  periodEnd: Date
): number {
  const totalSec = logs
    .filter((log) => log.startTime >= periodStart && log.startTime <= periodEnd)
    .reduce((sum, log) => sum + log.durationSec, 0);
  return Math.round((totalSec / 3600) * 100) / 100;
}
