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
  paginatedLogs: TimeLogDto[];
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  hasNext: boolean;
  hasPrev: boolean;
  totalPages: number;
  totalCount: number;
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
      userId: filters.userId ?? ""
    });
  }, [filters]);

  const loadLogs = useCallback(async () => {
    if (!workspaceId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      let allItems: TimeLogDto[] = [];
      let cursor: string | undefined = undefined;
      let hasMore = true;

      while (hasMore && requestId === requestIdRef.current) {
        const path = buildTimeTrackerLogsQuery({ ...filters, limit: 250, cursor });
        const res = await api<ListTimeLogsResponseDto>(path, { workspaceId });
        if (requestId !== requestIdRef.current) return;

        allItems = [...allItems, ...res.items];
        cursor = res.nextCursor;
        hasMore = Boolean(res.nextCursor);
      }

      const seen = new Set<string>();
      const uniqueItems = allItems.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      setLogs(uniqueItems);
    } catch (e) {
      if (requestId === requestIdRef.current) {
        setError(e instanceof Error ? e.message : "Could not load time entries");
        setLogs([]);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [workspaceId, filters]);

  const loadLogsRef = useRef(loadLogs);
  useEffect(() => {
    loadLogsRef.current = loadLogs;
  }, [loadLogs]);

  useEffect(() => {
    requestIdRef.current += 1;
    setLogs([]);
    setPage(1);
    void loadLogsRef.current();
  }, [workspaceId, filterKey]);

  const totalCount = logs.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * limit;
    return logs.slice(start, start + limit);
  }, [logs, page, limit]);

  const setLimitAndResetPage = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  return {
    logs,
    paginatedLogs,
    loading,
    page,
    setPage,
    limit,
    setLimit: setLimitAndResetPage,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    totalPages,
    totalCount,
    error,
    refresh: loadLogs
  };
}
