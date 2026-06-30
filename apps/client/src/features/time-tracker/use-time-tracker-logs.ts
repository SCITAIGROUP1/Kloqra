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

  const requestIdRef = useRef(0);

  const filterKey = useMemo(() => {
    return JSON.stringify({
      from: filters.from.toISOString(),
      to: filters.to.toISOString(),
      projectId: filters.projectId ?? "",
      categoryId: filters.categoryId ?? "",
      taskId: filters.taskId ?? "",
      search: filters.search ?? "",
      billableOnly: filters.billableOnly ?? false
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
    void loadLogsRef.current();
  }, [workspaceId, filterKey]);

  return {
    logs,
    loading,
    error,
    refresh: loadLogs
  };
}
