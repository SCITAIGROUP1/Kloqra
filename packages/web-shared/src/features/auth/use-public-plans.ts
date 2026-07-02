"use client";

import { ROUTES, type PublicPlanListDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { publicFetch } from "../../api/client";

export function usePublicPlans() {
  const [plans, setPlans] = useState<PublicPlanListDto["items"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await publicFetch<PublicPlanListDto>(ROUTES.PLANS.PUBLIC);
      setPlans(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load plans");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { plans, loading, error, reload };
}
