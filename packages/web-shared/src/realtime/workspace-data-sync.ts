import { NotificationType, type WorkspaceDataInvalidateScope } from "@kloqra/contracts";

export const WORKSPACE_DATA_STALE_EVENT = "kloqra:workspace-data-stale";

export type WorkspaceDataStaleDetail = {
  workspaceId: string;
  scopes: WorkspaceDataInvalidateScope[];
};

const TIMESHEET_MEMBER_TYPES = new Set<string>([
  NotificationType.TIMESHEET_APPROVED,
  NotificationType.TIMESHEET_REJECTED,
  NotificationType.TIMESHEET_REMINDER,
  NotificationType.TIMESHEET_MISSING_DIGEST,
  NotificationType.TIMESHEET_AMENDMENT_APPROVED,
  NotificationType.TIMESHEET_AMENDMENT_DENIED,
  NotificationType.TIMESHEET_STATUS
]);

const ADMIN_PENDING_TYPES = new Set<string>([
  NotificationType.TIMESHEET_SUBMITTED,
  NotificationType.TIMESHEET_AMENDMENT_REQUESTED,
  NotificationType.APPROVAL_REQUEST
]);

const PROJECT_TYPES = new Set<string>([
  NotificationType.PROJECT_ASSIGNMENT,
  NotificationType.PROJECT_UNASSIGNED,
  NotificationType.PROJECT_DEACTIVATED,
  NotificationType.TASK_ASSIGNMENT,
  NotificationType.TASK_UNASSIGNED
]);

export function scopesForNotificationType(type: string): WorkspaceDataInvalidateScope[] {
  const scopes = new Set<WorkspaceDataInvalidateScope>();
  if (TIMESHEET_MEMBER_TYPES.has(type)) {
    scopes.add("submissions");
    scopes.add("timesheet");
  }
  if (type === NotificationType.TIMESHEET_STATUS) {
    scopes.add("projects");
  }
  if (ADMIN_PENDING_TYPES.has(type)) {
    scopes.add("pending_approvals");
  }
  if (PROJECT_TYPES.has(type)) {
    scopes.add("projects");
    scopes.add("tasks");
  }
  return [...scopes];
}

export function dispatchWorkspaceDataStale(detail: WorkspaceDataStaleDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_DATA_STALE_EVENT, { detail }));
}

const invalidationHandlers = new Set<(detail: WorkspaceDataStaleDetail) => void>();

export function registerWorkspaceDataInvalidation(
  handler: (detail: WorkspaceDataStaleDetail) => void
): () => void {
  invalidationHandlers.add(handler);
  return () => invalidationHandlers.delete(handler);
}

export function invalidateWorkspaceData(
  workspaceId: string,
  scopes: WorkspaceDataInvalidateScope[]
): void {
  if (scopes.length === 0) return;
  const detail: WorkspaceDataStaleDetail = { workspaceId, scopes };
  dispatchWorkspaceDataStale(detail);
  for (const handler of invalidationHandlers) {
    handler(detail);
  }
}
