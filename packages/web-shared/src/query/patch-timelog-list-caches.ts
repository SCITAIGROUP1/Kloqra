import type { ListTimeLogsResponseDto, TimeLogDto } from "@kloqra/contracts";
import { getQueryClient } from "./query-client";
import { timelogQueryKeys } from "./timelog-query-keys";

export type TimelogCachePatch =
  | { type: "upsert"; log: TimeLogDto; projectId?: string }
  | { type: "upsertMany"; logs: TimeLogDto[]; projectId?: string }
  | { type: "remove"; logId: string };

export type TimelogListQueryMatchOptions = {
  projectId?: string;
};

function parseListQueryPath(path: string): URLSearchParams {
  const normalized = path.startsWith("all:") ? path.slice(4) : path;
  const query = normalized.includes("?") ? normalized.slice(normalized.indexOf("?")) : "";
  if (!query) return new URLSearchParams();
  return new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
}

/** True when a timelog matches a list query path's filters and date window. */
export function timelogMatchesListQueryPath(
  log: TimeLogDto,
  path: string,
  options?: TimelogListQueryMatchOptions
): boolean {
  const params = parseListQueryPath(path);
  if (params.size === 0) return true;

  const userId = params.get("userId");
  if (userId && log.userId !== userId) return false;

  const taskId = params.get("taskId");
  if (taskId && log.taskId !== taskId) return false;

  const projectId = params.get("projectId");
  if (projectId) {
    if (!options?.projectId || options.projectId !== projectId) return false;
  }

  const from = params.get("from");
  const to = params.get("to");
  if (!from || !to) return true;

  const startMs = new Date(log.startTime).getTime();
  if (Number.isNaN(startMs)) return true;

  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return true;

  return startMs >= fromMs && startMs <= toMs;
}

function listPathFromQueryKey(key: readonly unknown[]): string | null {
  const path = key[2];
  return typeof path === "string" ? path : null;
}

function patchListData(
  data: ListTimeLogsResponseDto | undefined,
  patch: (items: TimeLogDto[]) => TimeLogDto[]
): ListTimeLogsResponseDto {
  const items = data?.items ?? [];
  return { ...(data ?? { items: [] }), items: patch(items) };
}

function forEachTimelogListQuery(
  workspaceId: string,
  apply: (key: readonly unknown[], path: string, data: ListTimeLogsResponseDto | undefined) => void
): void {
  const client = getQueryClient();
  const queries = client.getQueryCache().findAll({
    queryKey: timelogQueryKeys.workspace(workspaceId)
  });

  for (const query of queries) {
    const key = query.queryKey;
    const path = listPathFromQueryKey(key);
    if (!path) continue;
    const data = client.getQueryData<ListTimeLogsResponseDto>(key);
    apply(key, path, data);
  }
}

/** Remove a timelog id from every cached list query for a workspace. */
export function removeTimelogFromListCaches(workspaceId: string, logId: string): void {
  const client = getQueryClient();

  forEachTimelogListQuery(workspaceId, (key, _path, data) => {
    client.setQueryData(
      key,
      patchListData(data, (items) => items.filter((item) => item.id !== logId))
    );
  });
}

/**
 * Move a timelog across cached list queries: drop from all windows, then insert into matches.
 * Fixes ghost entries when startTime moves outside a query's from/to window.
 */
export function relocateTimelogInListCaches(
  workspaceId: string,
  log: TimeLogDto,
  options?: TimelogListQueryMatchOptions
): void {
  removeTimelogFromListCaches(workspaceId, log.id);

  const client = getQueryClient();
  forEachTimelogListQuery(workspaceId, (key, path, data) => {
    if (!timelogMatchesListQueryPath(log, path, options)) return;
    client.setQueryData(
      key,
      patchListData(data, (items) => [log, ...items])
    );
  });
}

/** Immediately reflect a created/updated timelog in all cached list queries for a workspace. */
export function upsertTimelogInListCaches(
  workspaceId: string,
  log: TimeLogDto,
  options?: TimelogListQueryMatchOptions
): void {
  relocateTimelogInListCaches(workspaceId, log, options);
}

export function applyTimelogCachePatch(workspaceId: string, patch: TimelogCachePatch): void {
  switch (patch.type) {
    case "upsert":
      upsertTimelogInListCaches(workspaceId, patch.log, { projectId: patch.projectId });
      return;
    case "upsertMany":
      for (const log of patch.logs) {
        upsertTimelogInListCaches(workspaceId, log, { projectId: patch.projectId });
      }
      return;
    case "remove":
      removeTimelogFromListCaches(workspaceId, patch.logId);
  }
}
