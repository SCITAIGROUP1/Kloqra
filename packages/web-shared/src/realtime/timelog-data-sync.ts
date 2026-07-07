import type { WorkspaceDataInvalidateScope } from "@kloqra/contracts";
import { clearInflightGetRequestsForPath } from "../api/inflight-requests";
import { invalidateTimelogQueries } from "../query/invalidate-timelog-queries";
import { invalidateWorkspaceData } from "./workspace-data-sync";

export const TIMELOG_INVALIDATE_SCOPES: WorkspaceDataInvalidateScope[] = ["timelogs", "timesheet"];

function clearTimelogInflightRequests(): void {
  clearInflightGetRequestsForPath("/timelogs");
}

/** Broadcast timelog stale to every mounted view (timesheet, tracker, dashboard, timer). */
export function invalidateTimelogData(workspaceId: string): void {
  clearTimelogInflightRequests();
  invalidateTimelogQueries(workspaceId);
  invalidateWorkspaceData(workspaceId, TIMELOG_INVALIDATE_SCOPES);
}

/** Refresh the current view, then notify other views. Call after create/update/delete. */
export async function commitTimelogMutation(
  workspaceId: string,
  localRefresh?: () => void | Promise<void>
): Promise<void> {
  clearTimelogInflightRequests();
  if (localRefresh) {
    await localRefresh();
  }
  invalidateTimelogData(workspaceId);
}
