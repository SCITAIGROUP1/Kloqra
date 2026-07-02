"use client";

import { WORKSPACE_DATA_STALE_EVENT, type WorkspaceDataStaleDetail } from "@kloqra/web-shared";
import { useEffect } from "react";
import { refreshEntryCatalog } from "./entry-catalog";
import { useMySubmissionsStore } from "@/stores/member-data.store";

function refetchCatalog(workspaceId: string) {
  void refreshEntryCatalog(workspaceId);
}

export function useClientWorkspaceDataSync(workspaceId: string) {
  useEffect(() => {
    if (!workspaceId) return;

    const onStale = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceDataStaleDetail>).detail;
      if (!detail || detail.workspaceId !== workspaceId) return;

      if (detail.scopes.includes("submissions") || detail.scopes.includes("timesheet")) {
        useMySubmissionsStore.getState().invalidate(workspaceId);
      }
      if (
        detail.scopes.includes("projects") ||
        detail.scopes.includes("tasks") ||
        detail.scopes.includes("categories")
      ) {
        refetchCatalog(workspaceId);
      }
    };

    window.addEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
    return () => window.removeEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
  }, [workspaceId]);
}
