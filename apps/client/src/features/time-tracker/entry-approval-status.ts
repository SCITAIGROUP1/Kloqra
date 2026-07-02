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

export type TimeEntryFreezeReason = "project" | "category" | "task" | "approval";

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

export function resolveInactiveFreezeReason(
  project: ProjectDto | undefined,
  task: TaskDto | undefined,
  category: CategoryDto | undefined
): "project" | "category" | "task" | null {
  if (project && !project.isActive) return "project";
  if (category && !category.isActive) return "category";
  if (task && !task.isActive) return "task";
  return null;
}

export function resolveTimeEntryFreezeReason(
  log: TimeLogDto,
  project: ProjectDto | undefined,
  task: TaskDto | undefined,
  category: CategoryDto | undefined,
  submissionByKey: Map<string, TimesheetPeriodDto>
): TimeEntryFreezeReason | null {
  const inactive = resolveInactiveFreezeReason(project, task, category);
  if (inactive) return inactive;
  if (isTimeEntryLocked(log, project, submissionByKey)) return "approval";
  return null;
}

export function isTimeEntryReadOnly(
  log: TimeLogDto,
  project: ProjectDto | undefined,
  task: TaskDto | undefined,
  category: CategoryDto | undefined,
  submissionByKey: Map<string, TimesheetPeriodDto>
): boolean {
  return resolveTimeEntryFreezeReason(log, project, task, category, submissionByKey) !== null;
}

export function messageForFreezeReason(reason: TimeEntryFreezeReason): string {
  switch (reason) {
    case "project":
      return INACTIVE_PROJECT_MESSAGE;
    case "category":
      return INACTIVE_CATEGORY_MESSAGE;
    case "task":
      return INACTIVE_TASK_MESSAGE;
    case "approval":
      return "Locked — submitted or approved";
  }
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

export const INACTIVE_PROJECT_MESSAGE = "Locked — project is inactive";
export const INACTIVE_CATEGORY_MESSAGE = "Locked — category is inactive";
export const INACTIVE_TASK_MESSAGE = "Locked — task is inactive";
