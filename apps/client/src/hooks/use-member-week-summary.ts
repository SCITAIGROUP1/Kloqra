"use client";

import { useEffect } from "react";
import { useMemberReportingStore } from "@/stores/member-data.store";

export function useMemberWeekSummary(workspaceId: string, enabled = true) {
  const summary = useMemberReportingStore((s) =>
    enabled && workspaceId ? (s.weekSummaryByWorkspace[workspaceId]?.summary ?? null) : null
  );
  const loading = useMemberReportingStore((s) =>
    enabled && workspaceId ? (s.weekSummaryByWorkspace[workspaceId]?.loading ?? false) : false
  );
  const subscribeWeekSummary = useMemberReportingStore((s) => s.subscribeWeekSummary);
  const refreshWeekSummary = useMemberReportingStore((s) => s.refreshWeekSummary);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    return subscribeWeekSummary(workspaceId);
  }, [enabled, workspaceId, subscribeWeekSummary]);

  return {
    summary,
    loading,
    refresh: () => refreshWeekSummary(workspaceId)
  };
}
