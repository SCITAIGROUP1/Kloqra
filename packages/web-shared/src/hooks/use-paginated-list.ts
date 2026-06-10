"use client";

import { DEFAULT_TABLE_PAGE_SIZE, type PaginatedResponse } from "@kloqra/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPaginatedList } from "../api/fetch-list-items";

type UsePaginatedListOptions = {
  enabled?: boolean;
  workspaceId: string;
  basePath: string;
  filters?: Record<string, string | undefined>;
  debounceMs?: number;
};

export function usePaginatedList<T>({
  enabled = true,
  workspaceId,
  basePath,
  filters,
  debounceMs = 300
}: UsePaginatedListOptions) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterKey]);

  const reload = useCallback(async () => {
    if (!enabled || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPaginatedList<T>(basePath, {
        workspaceId,
        page,
        search: debouncedSearch,
        filters
      });
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setItems([]);
      setTotal(0);
      setTotalPages(0);
      setError("Could not load data.");
    } finally {
      setLoading(false);
    }
  }, [enabled, workspaceId, basePath, page, debouncedSearch, filters]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    items,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit: DEFAULT_TABLE_PAGE_SIZE,
    loading,
    error,
    reload
  };
}

export type PaginatedListState<T> = PaginatedResponse<T> & {
  loading: boolean;
  error: string | null;
};
