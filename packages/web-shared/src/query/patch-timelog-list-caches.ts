import type { ListTimeLogsResponseDto, TimeLogDto } from "@kloqra/contracts";
import { getQueryClient } from "./query-client";
import { timelogQueryKeys } from "./timelog-query-keys";

export type TimelogCachePatch =
  | { type: "upsert"; log: TimeLogDto }
  | { type: "upsertMany"; logs: TimeLogDto[] }
  | { type: "remove"; logId: string };

function patchListData(
  data: ListTimeLogsResponseDto | undefined,
  patch: (items: TimeLogDto[]) => TimeLogDto[]
): ListTimeLogsResponseDto | undefined {
  if (!data) return data;
  return { ...data, items: patch(data.items ?? []) };
}

/** Immediately reflect a created/updated timelog in all cached list queries for a workspace. */
export function upsertTimelogInListCaches(workspaceId: string, log: TimeLogDto): void {
  const client = getQueryClient();
  const queries = client.getQueriesData<ListTimeLogsResponseDto>({
    queryKey: timelogQueryKeys.workspace(workspaceId)
  });

  for (const [key, data] of queries) {
    const next = patchListData(data, (items) => {
      const index = items.findIndex((item) => item.id === log.id);
      if (index === -1) return [log, ...items];
      return items.map((item, i) => (i === index ? log : item));
    });
    if (next) client.setQueryData(key, next);
  }
}

/** Immediately remove a deleted timelog from all cached list queries for a workspace. */
export function removeTimelogFromListCaches(workspaceId: string, logId: string): void {
  const client = getQueryClient();
  const queries = client.getQueriesData<ListTimeLogsResponseDto>({
    queryKey: timelogQueryKeys.workspace(workspaceId)
  });

  for (const [key, data] of queries) {
    const next = patchListData(data, (items) => items.filter((item) => item.id !== logId));
    if (next) client.setQueryData(key, next);
  }
}

export function applyTimelogCachePatch(workspaceId: string, patch: TimelogCachePatch): void {
  switch (patch.type) {
    case "upsert":
      upsertTimelogInListCaches(workspaceId, patch.log);
      return;
    case "upsertMany":
      for (const log of patch.logs) {
        upsertTimelogInListCaches(workspaceId, log);
      }
      return;
    case "remove":
      removeTimelogFromListCaches(workspaceId, patch.logId);
  }
}
