import { ROUTES } from "@kloqra/contracts";

export const TIME_TRACKER_PAGE_SIZE = 50;

export type TimeTrackerServerFilters = {
  from: Date;
  to: Date;
  projectId?: string;
  categoryId?: string;
  taskId?: string;
  search?: string;
  billableOnly?: boolean;
  cursor?: string;
  limit?: number;
};

export function buildTimeTrackerLogsQuery(filters: TimeTrackerServerFilters): string {
  const params = new URLSearchParams({
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
    limit: String(filters.limit ?? TIME_TRACKER_PAGE_SIZE)
  });

  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.taskId) params.set("taskId", filters.taskId);
  if (filters.search) params.set("search", filters.search);
  if (filters.billableOnly) params.set("billableOnly", "true");
  if (filters.cursor) params.set("cursor", filters.cursor);

  return `${ROUTES.TIMELOGS.LIST}?${params}`;
}
