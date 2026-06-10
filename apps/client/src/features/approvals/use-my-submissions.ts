"use client";

import { ROUTES } from "@kloqra/contracts";
import type { ListTimesheetSubmissionsResponseDto, TimesheetPeriodDto } from "@kloqra/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

export type SubmissionsScope = "logged" | "assigned";

export function countActionableSubmissions(submissions: TimesheetPeriodDto[]): number {
  return submissions.filter((s) => s.status === "DRAFT" || s.status === "REJECTED").length;
}

export function countPendingReviewSubmissions(submissions: TimesheetPeriodDto[]): number {
  return submissions.filter((s) => s.status === "SUBMITTED").length;
}

export function useMySubmissions(
  workspaceId: string,
  anchorDate: Date,
  scope: SubmissionsScope = "assigned",
  enabled = true
) {
  const [submissions, setSubmissions] = useState<TimesheetPeriodDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: anchorDate.toISOString(),
        scope
      });
      const res = await api<ListTimesheetSubmissionsResponseDto>(
        `${ROUTES.TIMESHEETS.MY_SUBMISSIONS}?${params}`,
        { workspaceId }
      );
      setSubmissions(res.items);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, anchorDate, scope]);

  useEffect(() => {
    if (enabled && workspaceId) {
      void refresh();
    }
  }, [enabled, workspaceId, refresh]);

  const actionableCount = useMemo(() => countActionableSubmissions(submissions), [submissions]);
  const pendingReviewCount = useMemo(
    () => countPendingReviewSubmissions(submissions),
    [submissions]
  );

  return {
    submissions,
    loading,
    refresh,
    actionableCount,
    pendingReviewCount
  };
}
