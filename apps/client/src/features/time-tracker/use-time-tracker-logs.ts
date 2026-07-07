"use client";

import type { TimeLogDto } from "@kloqra/contracts";
import { useTimelogListAllQuery } from "@kloqra/web-shared";
import { useMemo } from "react";
import type { TimeTrackerServerFilters } from "./time-tracker-logs-query";
import { buildTimeTrackerLogsQuery } from "@/features/time-tracker/time-tracker-logs-query";
import { useOfflineStore } from "@/stores/offline-store";

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
  const basePath = useMemo(() => buildTimeTrackerLogsQuery({ ...filters, limit: 250 }), [filters]);

  const { data, isLoading, error, refetch } = useTimelogListAllQuery(
    workspaceId,
    basePath,
    Boolean(workspaceId)
  );

  const offlineLogs = useOfflineStore((s) => s.offlineLogs);
  const offlineDeletions = useOfflineStore((s) => s.offlineDeletions);

  const displayedLogs = useMemo(() => {
    const serverLogs = data?.items ?? [];
    const activeServerLogs = serverLogs.filter((log) => !offlineDeletions.includes(log.id));

    const matchedOfflineLogs = offlineLogs
      .filter((log) => {
        const logStart = new Date(log.startTime);
        if (logStart < filters.from || logStart > filters.to) return false;
        if (filters.projectId && log.projectId !== filters.projectId) return false;
        if (filters.taskId && log.taskId !== filters.taskId) return false;
        if (filters.billableOnly && !log.isBillable) return false;
        if (filters.search) {
          const term = filters.search.toLowerCase();
          const desc = (log.description ?? "").toLowerCase();
          if (!desc.includes(term)) return false;
        }
        return true;
      })
      .map((log) => ({
        id: log.tempId,
        userId: "",
        taskId: log.taskId,
        startTime: log.startTime,
        endTime: log.endTime,
        durationSec: Math.floor(
          (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000
        ),
        description: log.description || null,
        isBillable: log.isBillable ?? true,
        source: "timer" as const,
        isOffline: true,
        syncStatus: log.syncStatus
      }));

    return [...matchedOfflineLogs, ...activeServerLogs];
  }, [data?.items, offlineLogs, offlineDeletions, filters]);

  return {
    logs: displayedLogs,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : "Could not load time entries") : null,
    refresh: async () => {
      await refetch();
    }
  };
}
