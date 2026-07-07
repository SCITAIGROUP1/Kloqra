"use client";

import { useEffect } from "react";
import { useMemberReportingStore } from "@/stores/member-data.store";
import { memberStoreKey } from "@/stores/member-store-cache-key";
import { useSessionStore } from "@/stores/session.store";

export function useMemberWeekSummary(workspaceId: string, enabled = true) {
  const userId = useSessionStore((s) => s.session?.user?.id);
  const cacheKey = userId && workspaceId ? memberStoreKey(userId, workspaceId) : "";

  const summary = useMemberReportingStore((s) =>
    enabled && cacheKey ? (s.weekSummaryByWorkspace[cacheKey]?.summary ?? null) : null
  );
  const loading = useMemberReportingStore((s) =>
    enabled && cacheKey ? (s.weekSummaryByWorkspace[cacheKey]?.loading ?? false) : false
  );
  const subscribeWeekSummary = useMemberReportingStore((s) => s.subscribeWeekSummary);
  const refreshWeekSummary = useMemberReportingStore((s) => s.refreshWeekSummary);

  useEffect(() => {
    if (!enabled || !workspaceId || !userId) return;
    return subscribeWeekSummary(workspaceId);
  }, [enabled, workspaceId, userId, subscribeWeekSummary]);

  return {
    summary,
    loading,
    refresh: () => refreshWeekSummary(workspaceId)
  };
}
