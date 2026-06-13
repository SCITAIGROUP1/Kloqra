"use client";

import {
  ROUTES,
  type ListPendingTimesheetsResponseDto,
  type PendingTimesheetDto,
  type TimesheetApprovalsFilterQuery
} from "@kloqra/contracts";
import { buildApprovalsFilterQueryString } from "@kloqra/web-shared";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function usePendingTimesheets(
  workspaceId: string,
  filters: TimesheetApprovalsFilterQuery,
  enabled = true
) {
  const [pending, setPending] = useState<PendingTimesheetDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const filterKey = buildApprovalsFilterQueryString(filters);

  const fetchPending = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const path = filterKey
        ? `${ROUTES.TIMESHEETS.LIST_PENDING}?${filterKey}`
        : ROUTES.TIMESHEETS.LIST_PENDING;
      const data = await api<ListPendingTimesheetsResponseDto>(path, { workspaceId });
      setPending(data.items ?? []);
    } catch {
      toast.error("Failed to load pending timesheets");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filterKey]);

  useEffect(() => {
    if (enabled && workspaceId) {
      void fetchPending();
    }
  }, [enabled, workspaceId, fetchPending]);

  const handleReview = useCallback(
    async (id: string, action: "approve" | "reject", reviewNote = "") => {
      if (!workspaceId) return;
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
        setPending((prev) => prev.filter((item) => item.id !== id));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to review timesheet");
      } finally {
        setActioningId(null);
      }
    },
    [workspaceId, fetchPending]
  );

  return {
    pending,
    loading,
    actioningId,
    fetchPending,
    handleReview,
    pendingCount: pending.length
  };
}
