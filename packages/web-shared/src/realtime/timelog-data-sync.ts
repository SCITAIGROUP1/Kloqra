import type { WorkspaceDataInvalidateScope } from "@kloqra/contracts";
import { clearInflightGetRequestsForPath } from "../api/inflight-requests";
import { invalidateTimelogQueries } from "../query/invalidate-timelog-queries";
import { applyTimelogCachePatch, type TimelogCachePatch } from "../query/patch-timelog-list-caches";
import { getQueryClient } from "../query/query-client";
import { timelogQueryKeys } from "../query/timelog-query-keys";
import { invalidateWorkspaceData } from "./workspace-data-sync";

export const TIMELOG_INVALIDATE_SCOPES: WorkspaceDataInvalidateScope[] = ["timelogs", "timesheet"];

function clearTimelogInflightRequests(): void {
  clearInflightGetRequestsForPath("/timelogs");
}

/** Broadcast timelog stale to every mounted view (timesheet, tracker, dashboard, timer). */
export async function invalidateTimelogData(workspaceId: string): Promise<void> {
  clearTimelogInflightRequests();
  await invalidateTimelogQueries(workspaceId);
  invalidateWorkspaceData(workspaceId, TIMELOG_INVALIDATE_SCOPES);
}

/** Refresh the current view, then notify other views. Call after create/update/delete. */
export async function commitTimelogMutation(
  workspaceId: string,
  localRefresh?: () => void | Promise<void>,
  cachePatch?: TimelogCachePatch
): Promise<void> {
  clearTimelogInflightRequests();
  await getQueryClient().cancelQueries({ queryKey: timelogQueryKeys.workspace(workspaceId) });
  if (cachePatch) {
    applyTimelogCachePatch(workspaceId, cachePatch);
  }
  if (localRefresh) {
    await localRefresh();
  }
  await invalidateTimelogData(workspaceId);
}
