import { ROUTES } from "@kloqra/contracts";

export const TIME_TRACKER_PAGE_SIZE = 50;

export type TimeTrackerServerFilters = {
  from: Date;
  to: Date;
  projectId?: string[];
  categoryId?: string;
  taskId?: string;
  search?: string;
  billableOnly?: boolean;
  cursor?: string;
  limit?: number;
  userId?: string[];
};

export function buildTimeTrackerLogsQuery(filters: TimeTrackerServerFilters): string {
  const params = new URLSearchParams({
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
    limit: String(filters.limit ?? TIME_TRACKER_PAGE_SIZE)
  });

  if (filters.projectId && filters.projectId.length > 0) {
    params.set("projectId", filters.projectId.join(","));
  }
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.taskId) params.set("taskId", filters.taskId);
  if (filters.search) params.set("search", filters.search);
  if (filters.billableOnly) params.set("billableOnly", "true");
  if (filters.cursor) params.set("cursor", filters.cursor);
  if (filters.userId && filters.userId.length > 0) {
    params.set("userId", filters.userId.join(","));
  }

  return `${ROUTES.TIMELOGS.LIST}?${params}`;
}
