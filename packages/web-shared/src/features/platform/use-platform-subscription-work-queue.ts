"use client";

import { ROUTES, type PlatformSubscriptionWorkQueueDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

export function usePlatformSubscriptionWorkQueue() {
  const [data, setData] = useState<PlatformSubscriptionWorkQueueDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api<PlatformSubscriptionWorkQueueDto>(
        ROUTES.PLATFORM.SUBSCRIPTION_WORK_QUEUE
      );
      setData(result);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load subscription work queue");
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    counts: data?.counts ?? {
      pastDue: 0,
      trialEnding: 0,
      salesPending: 0,
      receiptReview: 0,
      drift: 0
    },
    items: data?.items ?? [],
    loading,
    error,
    reload
  };
}
