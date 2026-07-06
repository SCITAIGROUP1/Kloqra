import type {
  CategoryDto,
  ProjectDto,
  TaskDto,
  TimeLogDto,
  TimesheetPeriodDto
} from "@kloqra/contracts";
import type { TimesheetApprovalStatus } from "@kloqra/ui";

export type EntryApprovalDisplay = {
  showApproval: boolean;
  status?: TimesheetApprovalStatus;
};

export function isEntityInactive(
  project: ProjectDto | undefined,
  task: TaskDto | undefined,
  category: CategoryDto | undefined
): boolean {
  if (project && !project.isActive) return true;
  if (category && !category.isActive) return true;
  if (task && !task.isActive) return true;
  return false;
}

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

export function isTimeEntryInactive(
  project: ProjectDto | undefined,
  task: TaskDto | undefined,
  category: CategoryDto | undefined
): boolean {
  return isEntityInactive(project, task, category);
}

export function isTimeEntryReadOnly(
  log: TimeLogDto,
  project: ProjectDto | undefined,
  task: TaskDto | undefined,
  category: CategoryDto | undefined,
  submissionByKey: Map<string, TimesheetPeriodDto>
): boolean {
  if (isTimeEntryInactive(project, task, category)) return true;
  return isTimeEntryLocked(log, project, submissionByKey);
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

export const INACTIVE_ENTITY_MESSAGE =
  "This entry is read-only because its project, category, or task is inactive.";
