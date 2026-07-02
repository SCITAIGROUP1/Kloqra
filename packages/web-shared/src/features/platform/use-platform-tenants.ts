"use client";

import {
  DEFAULT_TABLE_PAGE_SIZE,
  ROUTES,
  tablePaginationQuery,
  type ListPlatformTenantsQuery,
  type PlatformTenantListResponseDto
} from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

type UsePlatformTenantsOptions = {
  status?: ListPlatformTenantsQuery["status"];
  planSlug?: string;
  subscriptionStatus?: ListPlatformTenantsQuery["subscriptionStatus"];
  debounceMs?: number;
};

export function usePlatformTenants({
  status,
  planSlug,
  subscriptionStatus,
  debounceMs = 300
}: UsePlatformTenantsOptions = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [data, setData] = useState<PlatformTenantListResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, planSlug, subscriptionStatus]);

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
            ...(subscriptionStatus ? { subscriptionStatus } : {})
          },
          limit
        )
      );
      const result = await api<PlatformTenantListResponseDto>(
        `${ROUTES.PLATFORM.TENANTS}?${params.toString()}`
      );
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tenants");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, limit, page, planSlug, status, subscriptionStatus]);

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
