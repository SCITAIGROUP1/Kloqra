import type { ListTimeLogsResponseDto } from "@kloqra/contracts";
import { getQueryClient } from "./query-client";
import { timelogQueryKeys } from "./timelog-query-keys";

export async function invalidateTimelogQueries(workspaceId?: string): Promise<void> {
  const client = getQueryClient();
  const queryKey = workspaceId ? timelogQueryKeys.workspace(workspaceId) : timelogQueryKeys.all;
  await client.cancelQueries({ queryKey });
  // Refetch every cached timelog query (including unmounted pages) so navigation
  // does not show stale dashboard/timesheet data after edits elsewhere.
  await client.invalidateQueries({ queryKey, refetchType: "all" });
}

export type TimelogListQueryResult = ListTimeLogsResponseDto;
