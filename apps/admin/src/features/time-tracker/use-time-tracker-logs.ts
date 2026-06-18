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
  page: number;
  limit: number;
  setLimit: (limit: number) => void;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: () => void;
  prevPage: () => void;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useTimeTrackerLogs(
  workspaceId: string,
  filters: TimeTrackerServerFilters
): TimeTrackerLogsState {
  const [logs, setLogs] = useState<TimeLogDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);
  const [cursorsHistory, setCursorsHistory] = useState<(string | undefined)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  const requestIdRef = useRef(0);

  const filterKey = useMemo(() => {
    return JSON.stringify({
      from: filters.from.toISOString(),
      to: filters.to.toISOString(),
      projectId: filters.projectId ?? "",
      categoryId: filters.categoryId ?? "",
      taskId: filters.taskId ?? "",
      search: filters.search ?? "",
      billableOnly: filters.billableOnly ?? false,
      userId: filters.userId ?? "",
      limit
    });
  }, [filters, limit]);

  const fetchPage = useCallback(
    async (cursor: string | undefined) => {
      if (!workspaceId) return { items: [] as TimeLogDto[], nextCursor: undefined };

      const path = buildTimeTrackerLogsQuery({ ...filters, limit, cursor });
      const res = await api<ListTimeLogsResponseDto>(path, { workspaceId });
      return res;
    },
    [workspaceId, filters, limit]
  );

  const loadPage = useCallback(
    async (targetPage: number, cursor: string | undefined) => {
      if (!workspaceId) return;
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const res = await fetchPage(cursor);
        if (requestId !== requestIdRef.current) return;

        // de-duplicate just in case
        const seen = new Set<string>();
        const uniqueItems = res.items.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });

        setLogs(uniqueItems);
        setNextCursor(res.nextCursor);
        setPage(targetPage);
      } catch (e) {
        if (requestId === requestIdRef.current) {
          setError(e instanceof Error ? e.message : "Could not load time entries");
          setLogs([]);
          setNextCursor(undefined);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [workspaceId, fetchPage]
  );

  useEffect(() => {
    requestIdRef.current += 1;
    setLogs([]);
    setNextCursor(undefined);
    setPage(1);
    setCursorsHistory([]);
    void loadPage(1, undefined);
  }, [workspaceId, filterKey, loadPage]);

  const nextPage = useCallback(() => {
    if (!nextCursor || loading) return;
    setCursorsHistory((prev) => [...prev, nextCursor]);
    void loadPage(page + 1, nextCursor);
  }, [nextCursor, page, loading, loadPage]);

  const prevPage = useCallback(() => {
    if (page <= 1 || loading) return;
    const prevCursor = page === 2 ? undefined : cursorsHistory[page - 3];
    setCursorsHistory((prev) => prev.slice(0, -1));
    void loadPage(page - 1, prevCursor);
  }, [page, cursorsHistory, loading, loadPage]);

  const refresh = useCallback(async () => {
    const currentCursor = page === 1 ? undefined : cursorsHistory[page - 2];
    await loadPage(page, currentCursor);
  }, [page, cursorsHistory, loadPage]);

  return {
    logs,
    loading,
    page,
    limit,
    setLimit,
    hasNext: Boolean(nextCursor),
    hasPrev: page > 1,
    nextPage,
    prevPage,
    error,
    refresh
  };
}
