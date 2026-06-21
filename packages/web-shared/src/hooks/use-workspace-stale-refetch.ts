"use client";

import type { WorkspaceDataInvalidateScope } from "@kloqra/contracts";
import { useEffect, useMemo } from "react";
import {
  WORKSPACE_DATA_STALE_EVENT,
  type WorkspaceDataStaleDetail
} from "../realtime/workspace-data-sync";

/** Re-run data loaders when a realtime notification invalidates matching scopes. */
export function useWorkspaceStaleRefetch(
  workspaceId: string,
  scopes: WorkspaceDataInvalidateScope[],
  callback: () => void,
  enabled = true
) {
  const scopeKey = useMemo(() => scopes.join(","), [scopes]);
  const scopeSet = useMemo(() => new Set(scopes), [scopeKey, scopes]);

  useEffect(() => {
    if (!enabled || !workspaceId || scopeSet.size === 0 || typeof window === "undefined") {
      return;
    }

    const onStale = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceDataStaleDetail>).detail;
      if (!detail || detail.workspaceId !== workspaceId) return;
      if (detail.scopes.some((scope) => scopeSet.has(scope))) {
        callback();
      }
    };

    window.addEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
    return () => window.removeEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
  }, [workspaceId, scopeKey, scopeSet, callback, enabled]);
}
