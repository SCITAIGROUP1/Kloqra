"use client";

import { useEffect } from "react";
import { usePresenceStore } from "@/stores/presence.store";

export function usePresenceSnapshot(workspaceId: string, enabled = true) {
  const snapshot = usePresenceStore((s) =>
    enabled && workspaceId ? (s.byWorkspace[workspaceId]?.snapshot ?? null) : null
  );
  const loading = usePresenceStore((s) =>
    enabled && workspaceId ? (s.byWorkspace[workspaceId]?.loading ?? false) : false
  );
  const subscribe = usePresenceStore((s) => s.subscribe);
  const refresh = usePresenceStore((s) => s.refresh);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    return subscribe(workspaceId);
  }, [enabled, workspaceId, subscribe]);

  return { snapshot, loading, refresh: () => refresh(workspaceId) };
}
