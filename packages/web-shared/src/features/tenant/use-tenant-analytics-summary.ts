"use client";

import { ROUTES, type TenantAnalyticsSummaryDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";

export function useTenantAnalyticsSummary(from: string, to: string) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [summary, setSummary] = useState<TenantAnalyticsSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!ws || !from || !to) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      const data = await api<TenantAnalyticsSummaryDto>(
        `${ROUTES.TENANTS.ANALYTICS_SUMMARY}?${params}`,
        { workspaceId: ws }
      );
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load organization analytics");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [ws, from, to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, loading, error, reload };
}
