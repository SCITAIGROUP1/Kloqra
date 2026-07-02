"use client";

import { ROUTES, type TenantDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";

export function useTenantCurrent() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [tenant, setTenant] = useState<TenantDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!ws) {
      setTenant(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api<TenantDto>(ROUTES.TENANTS.CURRENT, { workspaceId: ws });
      setTenant(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load organization");
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tenant, loading, error, reload };
}
