"use client";

import { ROUTES, type PlanPricingCatalogDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { publicFetch } from "../../api/client";

export function usePricingPlans() {
  const [catalog, setCatalog] = useState<PlanPricingCatalogDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await publicFetch<PlanPricingCatalogDto>(ROUTES.PLANS.PRICING);
      setCatalog(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load pricing plans");
      setCatalog(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    catalog,
    plans: catalog?.items ?? [],
    baselineFeatures: catalog?.baselineFeatures ?? [],
    loading,
    error,
    reload
  };
}
