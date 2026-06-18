"use client";

import type { ListTimeLogsResponseDto, TimeLogDto } from "@kloqra/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildTimeTrackerLogsQuery,
  type TimeTrackerServerFilters
} from "./time-tracker-logs-query";
import { api } from "@/lib/api";

export type TimeTrackerLogsState = {
  logs: TimeLogDto[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  fullyLoaded: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
};

function filtersKey(filters: TimeTrackerServerFilters): string {
  return JSON.stringify({
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
    projectId: filters.projectId ?? "",
    categoryId: filters.categoryId ?? "",
    taskId: filters.taskId ?? "",
    search: filters.search ?? "",
    billableOnly: filters.billableOnly ?? false,
    userId: filters.userId ?? ""
  });
}

export function useTimeTrackerLogs(
  workspaceId: string,
  filters: TimeTrackerServerFilters
): TimeTrackerLogsState {
  const [logs, setLogs] = useState<TimeLogDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fullyLoaded, setFullyLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const autoLoadRef = useRef(false);
  const filterKey = useMemo(() => filtersKey(filters), [filters]);

  const fetchPage = useCallback(
    async (cursor: string | undefined, append: boolean) => {
      if (!workspaceId) return { items: [] as TimeLogDto[], nextCursor: undefined };

      const path = buildTimeTrackerLogsQuery({ ...filters, cursor });
      const res = await api<ListTimeLogsResponseDto>(path, { workspaceId });

      setLogs((prev) => (append ? [...prev, ...res.items] : res.items));
      setNextCursor(res.nextCursor);
      setFullyLoaded(!res.nextCursor);
      return res;
    },
    [workspaceId, filters]
  );

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setFullyLoaded(false);
    autoLoadRef.current = true;

    try {
      const res = await fetchPage(undefined, false);
      if (requestId !== requestIdRef.current) return;

      let cursor = res.nextCursor;
      while (cursor && autoLoadRef.current && requestId === requestIdRef.current) {
        setLoadingMore(true);
        const next = await fetchPage(cursor, true);
        if (requestId !== requestIdRef.current) return;
        cursor = next.nextCursor;
      }
    } catch (e) {
      if (requestId === requestIdRef.current) {
        setError(e instanceof Error ? e.message : "Could not load time entries");
        setLogs([]);
        setNextCursor(undefined);
        setFullyLoaded(true);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [workspaceId, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!workspaceId || !nextCursor || loading || loadingMore) return;
    autoLoadRef.current = false;
    setLoadingMore(true);
    setError(null);
    try {
      await fetchPage(nextCursor, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load more entries");
    } finally {
      setLoadingMore(false);
    }
  }, [workspaceId, nextCursor, loading, loadingMore, fetchPage]);

  useEffect(() => {
    autoLoadRef.current = false;
    requestIdRef.current += 1;
    setLogs([]);
    setNextCursor(undefined);
    void refresh();
  }, [workspaceId, filterKey, refresh]);

  return {
    logs,
    loading,
    loadingMore,
    hasMore: Boolean(nextCursor),
    fullyLoaded,
    error,
    loadMore,
    refresh
  };
}
