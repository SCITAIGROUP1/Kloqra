"use client";

import { useEffect } from "react";
import {
  WORKSPACE_DATA_STALE_EVENT,
  type WorkspaceDataStaleDetail
} from "../realtime/workspace-data-sync";
import { invalidateTimelogQueries } from "./invalidate-timelog-queries";

/** Bridge socket/local stale events to TanStack Query timelog caches. */
export function useTimelogQuerySync() {
  useEffect(() => {
    const onStale = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceDataStaleDetail>).detail;
      if (!detail?.scopes.includes("timelogs") && !detail?.scopes.includes("timesheet")) {
        return;
      }
      invalidateTimelogQueries(detail.workspaceId);
    };

    window.addEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
    return () => window.removeEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
  }, []);
}
