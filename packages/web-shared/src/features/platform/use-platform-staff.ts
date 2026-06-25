"use client";

import { DEFAULT_TABLE_PAGE_SIZE, tablePaginationQuery } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

export type PlatformStaffListResponseDto = {
  items: Array<{
    id: string;
    email: string;
    name: string;
    role: "SUPERADMIN" | "SUPPORT";
    isActive: boolean;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type UsePlatformStaffOptions = {
  role?: string;
  isActive?: boolean;
  debounceMs?: number;
};

export function usePlatformStaff({
  role,
  isActive,
  debounceMs = 300
}: UsePlatformStaffOptions = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [data, setData] = useState<PlatformStaffListResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, isActive]);

  const setLimitAndResetPage = useCallback((nextLimit: number) => {
    setPage(1);
    setLimit(nextLimit);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const customFilters: Record<string, string> = {};
      if (role && role !== "__all__") customFilters.role = role;
      if (isActive !== undefined) customFilters.isActive = String(isActive);

      const params = new URLSearchParams(
        tablePaginationQuery(
          page,
          debouncedSearch,
          customFilters,
          limit
        )
      );
      const result = await api<PlatformStaffListResponseDto>(
        `/platform/staff?${params.toString()}`
      );
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load staff");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, limit, page, role, isActive]);

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
