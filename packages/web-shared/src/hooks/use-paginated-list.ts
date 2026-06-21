"use client";

import {
  DEFAULT_TABLE_PAGE_SIZE,
  type PaginatedResponse,
  type WorkspaceDataInvalidateScope
} from "@kloqra/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPaginatedList } from "../api/fetch-list-items";
import { useWorkspaceStaleRefetch } from "./use-workspace-stale-refetch";

type UsePaginatedListOptions = {
  enabled?: boolean;
  workspaceId: string;
  basePath: string;
  filters?: Record<string, string | undefined>;
  debounceMs?: number;
  /** Refetch when the user returns to this browser tab. */
  refreshOnFocus?: boolean;
  /** Refetch when a realtime notification invalidates these scopes. */
  refreshOnStaleScopes?: WorkspaceDataInvalidateScope[];
};

export function usePaginatedList<T>({
  enabled = true,
  workspaceId,
  basePath,
  filters,
  debounceMs = 300,
  refreshOnFocus = false,
  refreshOnStaleScopes
}: UsePaginatedListOptions) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);
  const stableFilters = useMemo(
    () => filters,
    // filterKey captures serialized filter values; ignore unstable object identity from callers.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by filterKey
    [filterKey]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterKey]);

  const setLimitAndResetPage = useCallback((nextLimit: number) => {
    setPage(1);
    setLimit(nextLimit);
  }, []);

  const reload = useCallback(async () => {
    if (!enabled || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPaginatedList<T>(basePath, {
        workspaceId,
        page,
        limit,
        search: debouncedSearch,
        filters: stableFilters
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? data.items?.length ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setItems([]);
      setTotal(0);
      setTotalPages(0);
      setError("Could not load data.");
    } finally {
      setLoading(false);
    }
  }, [enabled, workspaceId, basePath, page, limit, debouncedSearch, stableFilters]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!refreshOnFocus || !enabled || !workspaceId || typeof window === "undefined") return;

    const run = () => {
      void reload();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };

    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshOnFocus, enabled, workspaceId, reload]);

  useWorkspaceStaleRefetch(
    workspaceId,
    refreshOnStaleScopes ?? [],
    () => {
      void reload();
    },
    enabled && Boolean(refreshOnStaleScopes?.length)
  );

  return {
    items,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit,
    setLimit: setLimitAndResetPage,
    loading,
    error,
    reload
  };
}

export type PaginatedListState<T> = PaginatedResponse<T> & {
  loading: boolean;
  error: string | null;
};
