"use client";

import { ROUTES, type TenantOverviewDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { tenantApiOptions, useTenantApiWorkspaceId } from "./tenant-api-workspace";

export function useTenantOverview() {
  const workspaceId = useTenantApiWorkspaceId();
  const [overview, setOverview] = useState<TenantOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<TenantOverviewDto>(
        ROUTES.TENANTS.OVERVIEW,
        tenantApiOptions(workspaceId)
      );
      setOverview(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "We couldn't load your account overview. Please try again."
      );
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { overview, loading, error, reload };
}
