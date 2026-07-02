"use client";

import {
  DEFAULT_TABLE_PAGE_SIZE,
  ROUTES,
  tablePaginationQuery,
  type ListPlatformSubscriptionsQuery,
  type PlatformSubscriptionListResponseDto
} from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

type UsePlatformSubscriptionsOptions = {
  status?: ListPlatformSubscriptionsQuery["status"];
  planSlug?: string;
  billingSource?: string;
  renewingWithinDays?: number;
  workItem?: ListPlatformSubscriptionsQuery["workItem"];
  debounceMs?: number;
};

export function usePlatformSubscriptions({
  status,
  planSlug,
  billingSource,
  renewingWithinDays,
  workItem,
  debounceMs = 300
}: UsePlatformSubscriptionsOptions = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [data, setData] = useState<PlatformSubscriptionListResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, planSlug, billingSource, renewingWithinDays, workItem]);

  const setLimitAndResetPage = useCallback((nextLimit: number) => {
    setPage(1);
    setLimit(nextLimit);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(
        tablePaginationQuery(
          page,
          debouncedSearch,
          {
            ...(status ? { status } : {}),
            ...(planSlug ? { planSlug } : {}),
            ...(billingSource ? { billingSource } : {}),
            ...(renewingWithinDays !== undefined
              ? { renewingWithinDays: String(renewingWithinDays) }
              : {}),
            ...(workItem ? { workItem } : {})
          },
          limit
        )
      );
      const result = await api<PlatformSubscriptionListResponseDto>(
        `${ROUTES.PLATFORM.SUBSCRIPTIONS}?${params.toString()}`
      );
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load subscriptions");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, limit, page, planSlug, status, billingSource, renewingWithinDays, workItem]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    items: data?.items ?? [],
    page,
    setPage,
    search,
    setSearch,
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    limit,
    setLimit: setLimitAndResetPage,
    loading,
    error,
    reload
  };
}
