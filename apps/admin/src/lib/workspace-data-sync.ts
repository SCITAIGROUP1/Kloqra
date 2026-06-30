"use client";

import { WORKSPACE_DATA_STALE_EVENT, type WorkspaceDataStaleDetail } from "@kloqra/web-shared";
import { useEffect } from "react";
import { triggerApprovalsRefresh } from "@/lib/approvals-refresh-registry";
import { usePendingTimesheetsStore } from "@/stores/pending-timesheets.store";

export function useAdminWorkspaceDataSync(workspaceId: string) {
  useEffect(() => {
    if (!workspaceId) return;

    const onStale = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceDataStaleDetail>).detail;
      if (!detail || detail.workspaceId !== workspaceId) return;

      if (detail.scopes.includes("pending_approvals")) {
        usePendingTimesheetsStore.getState().refreshWorkspace(workspaceId);
        triggerApprovalsRefresh();
      }
    };

    window.addEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
    return () => window.removeEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
  }, [workspaceId]);
}
