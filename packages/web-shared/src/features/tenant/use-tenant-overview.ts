"use client";

import { ROUTES, type TenantOverviewDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";

export function useTenantOverview() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [overview, setOverview] = useState<TenantOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!ws) {
      setOverview(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api<TenantOverviewDto>(ROUTES.TENANTS.OVERVIEW, { workspaceId: ws });
      setOverview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load account overview");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { overview, loading, error, reload };
}
