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

export type FreezeReason = "project" | "category" | "task" | null;

export const INACTIVE_ENTITY_MESSAGE =
  "This entry is read-only because the project, category, or task is inactive.";

export const INACTIVE_PROJECT_MESSAGE = "Locked — project is inactive";
export const INACTIVE_CATEGORY_MESSAGE = "Locked — category is inactive";
export const INACTIVE_TASK_MESSAGE = "Locked — task is inactive";

export const LOCKED_ENTRY_MESSAGE =
  "This entry is locked (submitted or approved) and cannot be deleted.";

export function resolveTimeEntryFreezeReason(
  project: ProjectDto | undefined,
  task: TaskDto | undefined,
  category: CategoryDto | undefined
): FreezeReason {
  if (project?.isActive === false) return "project";
  if (category?.isActive === false) return "category";
  if (task?.isActive === false) return "task";
  return null;
}

export function getTimeEntryFreezeMessage(reason: Exclude<FreezeReason, null>): string {
  switch (reason) {
    case "project":
      return INACTIVE_PROJECT_MESSAGE;
    case "category":
      return INACTIVE_CATEGORY_MESSAGE;
    case "task":
      return INACTIVE_TASK_MESSAGE;
  }
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

export function isTimeEntryReadOnly(
  log: TimeLogDto,
  project: ProjectDto | undefined,
  task: TaskDto | undefined,
  category: CategoryDto | undefined,
  submissionByKey: Map<string, TimesheetPeriodDto>
): boolean {
  if (resolveTimeEntryFreezeReason(project, task, category) !== null) {
    return true;
  }
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
