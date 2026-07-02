"use client";

import { ROUTES, type PlatformOpsSummaryDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

export function usePlatformOpsSummary() {
  const [summary, setSummary] = useState<PlatformOpsSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<PlatformOpsSummaryDto>(ROUTES.PLATFORM.OPS_SUMMARY);
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load ops summary");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, loading, error, reload };
}
