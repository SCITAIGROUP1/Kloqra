import type { ListTimeLogsResponseDto } from "@kloqra/contracts";
import { clearInflightGetRequestsForPath } from "../api/inflight-requests";
import { getQueryClient } from "./query-client";
import { timelogQueryKeys } from "./timelog-query-keys";

export async function invalidateTimelogQueries(workspaceId?: string): Promise<void> {
  const client = getQueryClient();
  const queryKey = workspaceId ? timelogQueryKeys.workspace(workspaceId) : timelogQueryKeys.all;
  clearInflightGetRequestsForPath("/timelogs");
  await client.cancelQueries({ queryKey });
  // refetchQueries(type: "all") hits active, inactive, and disabled observers — invalidateQueries
  // alone skips disabled queries and left dashboard/timesheet caches stale after remote events.
  await client.refetchQueries({ queryKey, type: "all" });
}

export type TimelogListQueryResult = ListTimeLogsResponseDto;
