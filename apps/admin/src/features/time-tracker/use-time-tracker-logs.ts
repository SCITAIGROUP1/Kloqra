"use client";

import type { TimeLogDto } from "@kloqra/contracts";
import { useTimelogListAllQuery } from "@kloqra/web-shared";
import { useMemo } from "react";
import {
  buildTimeTrackerLogsQuery,
  type TimeTrackerServerFilters
} from "./time-tracker-logs-query";

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

  return {
    logs: data?.items ?? [],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : "Could not load time entries") : null,
    refresh: async () => {
      await refetch();
    }
  };
}
