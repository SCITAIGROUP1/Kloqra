"use client";

import { ROUTES, type PlatformSubscriptionDetailDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

export function usePlatformSubscriptionDetail(tenantId: string) {
  const [subscription, setSubscription] = useState<PlatformSubscriptionDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<PlatformSubscriptionDetailDto>(
        ROUTES.PLATFORM.SUBSCRIPTION_DETAIL(tenantId)
      );
      setSubscription(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load subscription details");
      setSubscription(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      void reload();
    }
  }, [tenantId, reload]);

  return { subscription, setSubscription, loading, error, reload };
}
