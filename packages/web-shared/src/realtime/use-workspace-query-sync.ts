"use client";

import type { WorkspaceDataInvalidateScope } from "@kloqra/contracts";
import { useEffect } from "react";
import { invalidateWorkspaceQueries } from "../query/invalidate-workspace-queries";
import {
  shouldSuppressLocalTimelogMutationEcho,
  WORKSPACE_DATA_STALE_EVENT,
  type WorkspaceDataStaleDetail
} from "./workspace-data-sync";

/**
 * Shell-level listener: maps workspace stale events to React Query invalidation.
 * Mount once per workspace shell alongside app-specific store sync.
 */
export function useWorkspaceQuerySync(workspaceId: string) {
  useEffect(() => {
    if (!workspaceId) return;

    const onStale = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceDataStaleDetail>).detail;
      if (!detail || detail.workspaceId !== workspaceId || detail.scopes.length === 0) return;
      // Creating tab already applied cache patch + derived invalidate — skip echo storm.
      if (shouldSuppressLocalTimelogMutationEcho(detail.workspaceId, detail.scopes)) {
        return;
      }
      void invalidateWorkspaceQueries(workspaceId, detail.scopes as WorkspaceDataInvalidateScope[]);
    };

    window.addEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
    return () => window.removeEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
  }, [workspaceId]);
}
