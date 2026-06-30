"use client";

import { ROUTES, type TimesheetApprovalsFilterQuery } from "@kloqra/contracts";
import { buildApprovalsFilterQueryString } from "@kloqra/web-shared";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  usePendingTimesheetsListKey,
  usePendingTimesheetsStore,
  EMPTY_PENDING_TIMESHEETS
} from "@/stores/pending-timesheets.store";

export function usePendingTimesheets(
  workspaceId: string,
  filters: TimesheetApprovalsFilterQuery,
  enabled = true
) {
  const filterKey = buildApprovalsFilterQueryString(filters);
  const listKey = usePendingTimesheetsListKey(workspaceId, filters);
  const pending = usePendingTimesheetsStore(
    (s) => s.byKey[listKey]?.items ?? EMPTY_PENDING_TIMESHEETS
  );
  const loading = usePendingTimesheetsStore((s) => s.byKey[listKey]?.loading ?? false);
  const subscribe = usePendingTimesheetsStore((s) => s.subscribe);
  const fetchPending = usePendingTimesheetsStore((s) => s.fetchPending);
  const removeItem = usePendingTimesheetsStore((s) => s.removeItem);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    return subscribe(workspaceId, filterKey);
  }, [enabled, workspaceId, filterKey, subscribe]);

  const refreshPending = useCallback(async () => {
    if (!workspaceId) return;
    await fetchPending(workspaceId, filterKey);
  }, [workspaceId, filterKey, fetchPending]);

  const handleReview = useCallback(
    async (id: string, action: "approve" | "reject", reviewNote = "") => {
      if (!workspaceId) return;
      if (action === "reject" && !reviewNote.trim()) {
        toast.error("A rejection reason is required");
        return;
      }
      setActioningId(id);
      try {
        const endpoint =
          action === "approve" ? ROUTES.TIMESHEETS.APPROVE(id) : ROUTES.TIMESHEETS.REJECT(id);
        await api(endpoint, {
          method: "PATCH",
          workspaceId,
          body: JSON.stringify({ reviewNote })
        });
        toast.success(`Timesheet ${action === "approve" ? "approved" : "rejected"} successfully`);
        removeItem(workspaceId, filterKey, id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to review timesheet");
      } finally {
        setActioningId(null);
      }
    },
    [workspaceId, filterKey, removeItem]
  );

  return {
    pending,
    loading,
    actioningId,
    fetchPending: refreshPending,
    handleReview,
    pendingCount: pending.length
  };
}

export function usePendingTimesheetsBadgeCount(workspaceId: string, enabled = true) {
  const filterKey = buildApprovalsFilterQueryString({});
  const listKey = usePendingTimesheetsListKey(workspaceId, {});
  const subscribe = usePendingTimesheetsStore((s) => s.subscribe);
  const count = usePendingTimesheetsStore((s) => s.byKey[listKey]?.items.length ?? 0);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    return subscribe(workspaceId, filterKey);
  }, [enabled, workspaceId, filterKey, subscribe]);

  return count;
}
