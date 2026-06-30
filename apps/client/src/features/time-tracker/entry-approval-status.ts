import type { ProjectDto, TimeLogDto, TimesheetPeriodDto } from "@kloqra/contracts";
import type { TimesheetApprovalStatus } from "@kloqra/ui";

export type EntryApprovalDisplay = {
  showApproval: boolean;
  status?: TimesheetApprovalStatus;
};

export function resolveEntryApprovalStatus(
  log: TimeLogDto,
  project: ProjectDto | undefined,
  submissionByKey: Map<string, TimesheetPeriodDto>
): EntryApprovalDisplay {
  if (!project?.timesheetApprovalEnabled) {
    return { showApproval: false };
  }

  const start = new Date(log.startTime);
  for (const sub of submissionByKey.values()) {
    if (sub.projectId !== project.id) continue;
    const pStart = new Date(sub.periodStart);
    const pEnd = new Date(sub.periodEnd);
    if (start >= pStart && start <= pEnd) {
      const status = sub.status === "WAIVED" ? "DRAFT" : sub.status;
      return { showApproval: true, status };
    }
  }

  return { showApproval: true, status: "DRAFT" };
}

export function isTimeEntryLocked(
  log: TimeLogDto,
  project: ProjectDto | undefined,
  submissionByKey: Map<string, TimesheetPeriodDto>
): boolean {
  const approval = resolveEntryApprovalStatus(log, project, submissionByKey);
  return approval.status === "SUBMITTED" || approval.status === "APPROVED";
}

export function buildSubmissionByKey(
  submissions: Iterable<TimesheetPeriodDto>
): Map<string, TimesheetPeriodDto> {
  const map = new Map<string, TimesheetPeriodDto>();
  for (const item of submissions) {
    map.set(`${item.projectId}:${item.periodStart}`, item);
  }
  return map;
}

export const LOCKED_ENTRY_MESSAGE =
  "This entry is locked (submitted or approved) and cannot be deleted.";
