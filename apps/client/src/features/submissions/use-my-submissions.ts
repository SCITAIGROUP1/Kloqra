"use client";

import type { TimesheetPeriodDto } from "@kloqra/contracts";
import { useCallback, useEffect, useMemo } from "react";
import {
  buildSubmissionsPath,
  EMPTY_SUBMISSIONS,
  useMySubmissionsStore
} from "@/stores/member-data.store";

export type SubmissionsScope = "logged" | "assigned";

export function countActionableSubmissions(submissions: TimesheetPeriodDto[]): number {
  return submissions.filter((s) => s.status === "DRAFT" || s.status === "REJECTED").length;
}

export function countPendingReviewSubmissions(submissions: TimesheetPeriodDto[]): number {
  return submissions.filter((s) => s.status === "SUBMITTED").length;
}

export function countAmendmentPendingSubmissions(submissions: TimesheetPeriodDto[]): number {
  return submissions.filter((s) => s.amendmentPending).length;
}

function buildScopedQueryKey(anchorDate: Date, scope: SubmissionsScope) {
  return `date=${anchorDate.toISOString()}&scope=${scope}`;
}

function buildScopedPath(anchorDate: Date, scope: SubmissionsScope) {
  const params = new URLSearchParams({
    date: anchorDate.toISOString(),
    scope
  });
  return buildSubmissionsPath(params);
}

export function useMySubmissions(
  workspaceId: string,
  anchorDate: Date,
  scope: SubmissionsScope = "assigned",
  enabled = true
) {
  const queryKey = buildScopedQueryKey(anchorDate, scope);
  const path = buildScopedPath(anchorDate, scope);
  const listKey = `${workspaceId}:${queryKey}`;
  const submissions = useMySubmissionsStore((s) => s.byKey[listKey]?.items ?? EMPTY_SUBMISSIONS);
  const loading = useMySubmissionsStore((s) => s.byKey[listKey]?.loading ?? false);
  const subscribe = useMySubmissionsStore((s) => s.subscribe);
  const fetchSubmissions = useMySubmissionsStore((s) => s.fetchSubmissions);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    return subscribe(workspaceId, queryKey, path);
  }, [enabled, workspaceId, queryKey, path, subscribe]);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    await fetchSubmissions(workspaceId, queryKey, path);
  }, [workspaceId, queryKey, path, fetchSubmissions]);

  const actionableCount = useMemo(() => countActionableSubmissions(submissions), [submissions]);
  const pendingReviewCount = useMemo(
    () => countPendingReviewSubmissions(submissions),
    [submissions]
  );
  const amendmentPendingCount = useMemo(
    () => countAmendmentPendingSubmissions(submissions),
    [submissions]
  );

  return {
    submissions,
    loading,
    refresh,
    actionableCount,
    pendingReviewCount,
    amendmentPendingCount
  };
}

export function useMySubmissionsBadgeCount(
  workspaceId: string,
  anchorDate: Date,
  scope: SubmissionsScope = "assigned",
  enabled = true
) {
  const queryKey = buildScopedQueryKey(anchorDate, scope);
  const path = buildScopedPath(anchorDate, scope);
  const listKey = `${workspaceId}:${queryKey}`;
  const subscribe = useMySubmissionsStore((s) => s.subscribe);
  const count = useMySubmissionsStore((s) => {
    const items = s.byKey[listKey]?.items ?? EMPTY_SUBMISSIONS;
    return countActionableSubmissions(items);
  });

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    return subscribe(workspaceId, queryKey, path);
  }, [enabled, workspaceId, queryKey, path, subscribe]);

  return count;
}

export function useDashboardSubmissions(workspaceId: string, enabled = true) {
  const queryKey = "all";
  const path = buildSubmissionsPath();
  const listKey = `${workspaceId}:${queryKey}`;
  const submissions = useMySubmissionsStore((s) => s.byKey[listKey]?.items ?? EMPTY_SUBMISSIONS);
  const loading = useMySubmissionsStore((s) => s.byKey[listKey]?.loading ?? false);
  const subscribe = useMySubmissionsStore((s) => s.subscribe);
  const fetchSubmissions = useMySubmissionsStore((s) => s.fetchSubmissions);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    return subscribe(workspaceId, queryKey, path);
  }, [enabled, workspaceId, queryKey, path, subscribe]);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    await fetchSubmissions(workspaceId, queryKey, path);
  }, [workspaceId, queryKey, path, fetchSubmissions]);

  return { submissions, loading, refresh };
}
