"use client";

import { ROUTES, type TenantDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { tenantApiOptions, useTenantApiWorkspaceId } from "./tenant-api-workspace";

export function useTenantCurrent() {
  const workspaceId = useTenantApiWorkspaceId();
  const [tenant, setTenant] = useState<TenantDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<TenantDto>(ROUTES.TENANTS.CURRENT, tenantApiOptions(workspaceId));
      setTenant(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn't load your organization profile. Please try again."
      );
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tenant, loading, error, reload };
}
