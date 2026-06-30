"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  ListMissingTimesheetsResponseDto,
  MissingTimesheetDto,
  TimesheetApprovalsFilterQuery
} from "@kloqra/contracts";
import { buildApprovalsFilterQueryString } from "@kloqra/web-shared";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function useMissingTimesheets(
  workspaceId: string,
  anchorDate: Date,
  filters: TimesheetApprovalsFilterQuery,
  enabled = true
) {
  const [missing, setMissing] = useState<MissingTimesheetDto[]>([]);
  const [loading, setLoading] = useState(false);

  const filterKey = buildApprovalsFilterQueryString(filters);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: anchorDate.toISOString() });
      if (filterKey) {
        for (const [key, value] of new URLSearchParams(filterKey)) {
          params.set(key, value);
        }
      }
      const res = await api<ListMissingTimesheetsResponseDto>(
        `${ROUTES.TIMESHEETS.LIST_MISSING}?${params}`,
        { workspaceId }
      );
      setMissing(res.items ?? []);
    } catch {
      toast.error("Failed to load missing submissions");
      setMissing([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, anchorDate, filterKey]);

  useEffect(() => {
    if (enabled && workspaceId) {
      void refresh();
    }
  }, [enabled, workspaceId, refresh]);

  return { missing, loading, refresh, missingCount: missing.length };
}
