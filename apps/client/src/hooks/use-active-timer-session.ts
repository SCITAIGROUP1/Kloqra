"use client";

import { useEffect } from "react";
import { useActiveTimerSessionStore } from "@/stores/member-data.store";

export function useActiveTimerSession(workspaceId: string, enabled = true) {
  const subscribeActive = useActiveTimerSessionStore((s) => s.subscribeActive);
  const refreshActive = useActiveTimerSessionStore((s) => s.refreshActive);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    return subscribeActive(workspaceId);
  }, [enabled, workspaceId, subscribeActive]);

  return { refresh: () => refreshActive(workspaceId) };
}
