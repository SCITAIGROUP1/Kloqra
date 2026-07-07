import type { ListTimeLogsResponseDto } from "@kloqra/contracts";
import { getQueryClient } from "./query-client";
import { timelogQueryKeys } from "./timelog-query-keys";

export function invalidateTimelogQueries(workspaceId?: string): void {
  const client = getQueryClient();
  if (workspaceId) {
    void client.invalidateQueries({ queryKey: timelogQueryKeys.workspace(workspaceId) });
    return;
  }
  void client.invalidateQueries({ queryKey: timelogQueryKeys.all });
}

export type TimelogListQueryResult = ListTimeLogsResponseDto;
