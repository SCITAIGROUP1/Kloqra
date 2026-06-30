"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  ListReviewedTimesheetsResponseDto,
  ReviewedTimesheetDto,
  TimesheetApprovalsFilterQuery
} from "@kloqra/contracts";
import { buildApprovalsFilterQueryString } from "@kloqra/web-shared";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRegisterApprovalsRefresh } from "./use-approvals-refresh-registration";
import { api } from "@/lib/api";

export function useReviewedTimesheets(
  workspaceId: string,
  status: "APPROVED" | "REJECTED",
  filters: TimesheetApprovalsFilterQuery,
  enabled = true
) {
  const [items, setItems] = useState<ReviewedTimesheetDto[]>([]);
  const [loading, setLoading] = useState(false);

  const filterKey = buildApprovalsFilterQueryString(filters);
  const route =
    status === "APPROVED" ? ROUTES.TIMESHEETS.LIST_APPROVED : ROUTES.TIMESHEETS.LIST_REJECTED;

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const path = filterKey ? `${route}?${filterKey}` : route;
      const res = await api<ListReviewedTimesheetsResponseDto>(path, { workspaceId });
      setItems(res.items ?? []);
    } catch {
      toast.error(`Failed to load ${status === "APPROVED" ? "approved" : "rejected"} timesheets`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filterKey, route, status]);

  useEffect(() => {
    if (enabled && workspaceId) {
      void refresh();
    }
  }, [enabled, workspaceId, refresh]);

  useRegisterApprovalsRefresh(refresh);

  return { items, loading, refresh, count: items.length };
}
