"use client";

import { ROUTES, type TenantSubscriptionDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";

export function useTenantSubscription(enabled = true) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [subscription, setSubscription] = useState<TenantSubscriptionDto | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled || !ws) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api<TenantSubscriptionDto>(ROUTES.TENANTS.SUBSCRIPTION, {
        workspaceId: ws
      });
      setSubscription(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load subscription");
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [ws, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { subscription, loading, error, reload };
}
