"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  ListAmendmentRequestsResponseDto,
  ListMissingTimesheetsResponseDto,
  ListPendingTimesheetsResponseDto,
  ListReviewedTimesheetsResponseDto,
  ListTimesheetSubmissionsResponseDto,
  TimesheetPeriodDto
} from "@kloqra/contracts";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "../api/client";
import { useSessionGeneration } from "../hooks/use-session-generation";
import { useSessionStore } from "../stores/session.store";
import { approvalsQueryKeys } from "./approvals-query-keys";
import { normalizeSubmissionDateKey } from "./submission-date-key";
import { submissionsQueryKeys } from "./submissions-query-keys";
import { isWorkspaceQuerySessionReady } from "./workspace-query-enabled";

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/** Wait until session + JWT agree on user/workspace so badge probes do not race switches. */
function useWorkspaceQueryEnabled(workspaceId: string, enabled: boolean): boolean {
  const sessionUserId = useSessionStore((s) => s.session?.user?.id);
  const sessionWorkspaceId = useSessionStore((s) => s.session?.workspaceId);
  const accessToken = useSessionStore((s) => s.accessToken);
  return isWorkspaceQuerySessionReady({
    enabled,
    workspaceId,
    sessionUserId,
    sessionWorkspaceId,
    accessToken
  });
}

function emptyPaginated<T>(): PaginatedResult<T> {
  return { items: [], total: 0, page: 1, limit: 25, totalPages: 0 };
}

export function buildPendingApprovalsPath(filterKey: string) {
  return filterKey
    ? `${ROUTES.TIMESHEETS.LIST_PENDING}?${filterKey}`
    : ROUTES.TIMESHEETS.LIST_PENDING;
}

export function usePendingTimesheetsQuery(
  workspaceId: string,
  filterKey: string,
  enabled = true,
  options?: { refetchInterval?: number | false }
) {
  const sessionGeneration = useSessionGeneration();
  const queryEnabled = useWorkspaceQueryEnabled(workspaceId, enabled);

  return useQuery({
    queryKey: approvalsQueryKeys.pending(workspaceId, filterKey, sessionGeneration),
    queryFn: ({ signal }) =>
      api<ListPendingTimesheetsResponseDto>(buildPendingApprovalsPath(filterKey), {
        workspaceId,
        signal
      }),
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: options?.refetchInterval
  });
}

export function usePendingAmendmentsQuery(workspaceId: string, filterKey: string, enabled = true) {
  const sessionGeneration = useSessionGeneration();
  const queryEnabled = useWorkspaceQueryEnabled(workspaceId, enabled);
  const path = filterKey
    ? `${ROUTES.TIMESHEETS.LIST_AMENDMENTS}?${filterKey}`
    : ROUTES.TIMESHEETS.LIST_AMENDMENTS;

  return useQuery({
    queryKey: approvalsQueryKeys.amendments(workspaceId, filterKey, sessionGeneration),
    queryFn: ({ signal }) => api<ListAmendmentRequestsResponseDto>(path, { workspaceId, signal }),
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}

export function useReviewedTimesheetsQuery(
  workspaceId: string,
  status: "APPROVED" | "REJECTED",
  filterKey: string,
  enabled = true
) {
  const sessionGeneration = useSessionGeneration();
  const queryEnabled = useWorkspaceQueryEnabled(workspaceId, enabled);
  const route =
    status === "APPROVED" ? ROUTES.TIMESHEETS.LIST_APPROVED : ROUTES.TIMESHEETS.LIST_REJECTED;
  const path = filterKey ? `${route}?${filterKey}` : route;

  return useQuery({
    queryKey: approvalsQueryKeys.reviewed(workspaceId, status, filterKey, sessionGeneration),
    queryFn: ({ signal }) => api<ListReviewedTimesheetsResponseDto>(path, { workspaceId, signal }),
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}

export function useAllTimesheetsQuery(workspaceId: string, filterKey: string, enabled = true) {
  const sessionGeneration = useSessionGeneration();
  const queryEnabled = useWorkspaceQueryEnabled(workspaceId, enabled);
  const path = filterKey
    ? `${ROUTES.TIMESHEETS.LIST_ALL}?${filterKey}`
    : ROUTES.TIMESHEETS.LIST_ALL;

  return useQuery({
    queryKey: approvalsQueryKeys.allTimesheets(workspaceId, filterKey, sessionGeneration),
    queryFn: ({ signal }) => api<ListReviewedTimesheetsResponseDto>(path, { workspaceId, signal }),
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}

export function useMissingTimesheetsQuery(
  workspaceId: string,
  anchorDate: Date,
  filterKey: string,
  enabled = true
) {
  const sessionGeneration = useSessionGeneration();
  const queryEnabled = useWorkspaceQueryEnabled(workspaceId, enabled);
  const anchorKey = anchorDate.toISOString();

  return useQuery({
    queryKey: approvalsQueryKeys.missing(workspaceId, anchorKey, filterKey, sessionGeneration),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ date: anchorKey });
      if (filterKey) {
        for (const [key, value] of new URLSearchParams(filterKey)) {
          params.set(key, value);
        }
      }
      return api<ListMissingTimesheetsResponseDto>(`${ROUTES.TIMESHEETS.LIST_MISSING}?${params}`, {
        workspaceId,
        signal
      });
    },
    enabled: queryEnabled,
    staleTime: 0,
    refetchOnMount: "always"
  });
}

export const SUBMISSIONS_LOOKBACK_WEEKS = 26;

export function buildSubmissionsLookbackQueryKey(
  lookbackWeeks: number,
  anchorDateKey: string,
  scope: "logged" | "assigned"
): string {
  return `lookback=${lookbackWeeks}&date=${normalizeSubmissionDateKey(anchorDateKey)}&scope=${scope}`;
}

/** Member submission list for a lookback window anchored on a calendar day (YYYY-MM-DD). */
export function useMySubmissionsLookbackQuery(
  workspaceId: string,
  anchorDateKey: string,
  lookbackWeeks: number,
  scope: "logged" | "assigned",
  enabled = true
) {
  const sessionGeneration = useSessionGeneration();
  const queryEnabled = useWorkspaceQueryEnabled(workspaceId, enabled);
  const dateKey = normalizeSubmissionDateKey(anchorDateKey);
  const queryKey = buildSubmissionsLookbackQueryKey(lookbackWeeks, dateKey, scope);
  const path = `${ROUTES.TIMESHEETS.MY_SUBMISSIONS}?${new URLSearchParams({
    date: dateKey,
    scope,
    lookbackWeeks: String(lookbackWeeks)
  })}`;

  return useQuery({
    queryKey: [...submissionsQueryKeys.list(workspaceId, queryKey), sessionGeneration],
    queryFn: ({ signal }) =>
      api<ListTimesheetSubmissionsResponseDto>(path, { workspaceId, signal }).then(
        (res) => res.items ?? []
      ),
    enabled: queryEnabled,
    staleTime: 60_000,
    refetchOnMount: true
  });
}

/** Submission lock status for visible timelogs — one lookback GET, never N×per-day. */
export function useTimesheetSubmissionStatusQuery(
  workspaceId: string,
  dates: string[],
  enabled = true
) {
  const uniqueDates = useMemo(
    () => [...new Set(dates.filter(Boolean).map(normalizeSubmissionDateKey))].sort(),
    [dates]
  );
  // Latest visible day (or today) anchors one lookback covering all periods we care about.
  const anchorDateKey = useMemo(() => {
    if (uniqueDates.length > 0) return uniqueDates[uniqueDates.length - 1]!;
    return normalizeSubmissionDateKey(new Date().toISOString());
  }, [uniqueDates]);

  const query = useMySubmissionsLookbackQuery(
    workspaceId,
    anchorDateKey,
    SUBMISSIONS_LOOKBACK_WEEKS,
    "assigned",
    enabled
  );

  const submissionByKey = useMemo(() => {
    const merged = new Map<string, TimesheetPeriodDto>();
    for (const item of query.data ?? []) {
      merged.set(`${item.projectId}:${item.periodStart}`, item);
    }
    return merged;
  }, [query.data]);

  return {
    submissionByKey,
    isLoading: query.isLoading,
    refetch: async () => {
      await query.refetch();
    }
  };
}

export function mapApprovalsQueryData<T>(
  data:
    | { items?: T[]; total?: number; page?: number; limit?: number; totalPages?: number }
    | undefined
): PaginatedResult<T> {
  if (!data) return emptyPaginated<T>();
  return {
    items: data.items ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    limit: data.limit ?? 25,
    totalPages: data.totalPages ?? 0
  };
}
