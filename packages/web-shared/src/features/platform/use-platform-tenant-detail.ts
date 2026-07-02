"use client";

import { ROUTES, type PlatformTenantDetailDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

export function usePlatformTenantDetail(tenantId: string) {
  const [tenant, setTenant] = useState<PlatformTenantDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<PlatformTenantDetailDto>(ROUTES.PLATFORM.TENANT(tenantId));
      setTenant(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tenant");
      setTenant(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tenant, setTenant, loading, error, reload };
}
