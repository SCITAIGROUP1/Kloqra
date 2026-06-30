"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  ListAmendmentRequestsResponseDto,
  TimesheetAmendmentDto,
  TimesheetApprovalsFilterQuery
} from "@kloqra/contracts";
import { buildApprovalsFilterQueryString } from "@kloqra/web-shared";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRegisterApprovalsRefresh } from "./use-approvals-refresh-registration";
import { api } from "@/lib/api";

export function usePendingAmendments(
  workspaceId: string,
  filters: TimesheetApprovalsFilterQuery,
  enabled = true
) {
  const [amendments, setAmendments] = useState<TimesheetAmendmentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const filterKey = buildApprovalsFilterQueryString(filters);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const path = filterKey
        ? `${ROUTES.TIMESHEETS.LIST_AMENDMENTS}?${filterKey}`
        : ROUTES.TIMESHEETS.LIST_AMENDMENTS;
      const res = await api<ListAmendmentRequestsResponseDto>(path, { workspaceId });
      setAmendments(res.items ?? []);
    } catch {
      toast.error("Failed to load amendment requests");
      setAmendments([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filterKey]);

  useEffect(() => {
    if (enabled && workspaceId) {
      void refresh();
    }
  }, [enabled, workspaceId, refresh]);

  useRegisterApprovalsRefresh(refresh);

  const handleReview = useCallback(
    async (id: string, action: "approve" | "deny", adminNote = "") => {
      if (!workspaceId) return;
      setActioningId(id);
      try {
        const endpoint =
          action === "approve"
            ? ROUTES.TIMESHEETS.APPROVE_AMENDMENT(id)
            : ROUTES.TIMESHEETS.DENY_AMENDMENT(id);
        await api(endpoint, {
          method: "PATCH",
          workspaceId,
          body: JSON.stringify({ adminNote: adminNote || undefined })
        });
        toast.success(
          action === "approve" ? "Edit request approved — period unlocked" : "Edit request denied"
        );
        setAmendments((prev) => prev.filter((item) => item.id !== id));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to review amendment");
      } finally {
        setActioningId(null);
      }
    },
    [workspaceId, refresh]
  );

  return {
    amendments,
    loading,
    actioningId,
    refresh,
    handleReview,
    amendmentCount: amendments.length
  };
}
