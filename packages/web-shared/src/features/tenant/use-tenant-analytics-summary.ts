"use client";

import { ROUTES, type TenantAnalyticsSummaryDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { tenantApiOptions, useTenantApiWorkspaceId } from "./tenant-api-workspace";

export function useTenantAnalyticsSummary(from: string, to: string) {
  const workspaceId = useTenantApiWorkspaceId();
  const [summary, setSummary] = useState<TenantAnalyticsSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!from || !to) {
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
        tenantApiOptions(workspaceId)
      );
      setSummary(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn't load organization analytics. Please try again."
      );
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, from, to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, loading, error, reload };
}
