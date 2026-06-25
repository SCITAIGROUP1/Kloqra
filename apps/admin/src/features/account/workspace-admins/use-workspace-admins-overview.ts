"use client";

import { ROUTES, DEFAULT_TABLE_PAGE_SIZE } from "@kloqra/contracts";
import type { WorkspaceAdminsOverviewDto } from "@kloqra/contracts";
import { buildTableQuery } from "@kloqra/web-shared";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

type WorkspaceAdminsOverviewFilters = {
  workspaceIds?: string[];
  status?: "active" | "inactive";
  membershipActive?: boolean;
};

export function useWorkspaceAdminsOverview(filters: WorkspaceAdminsOverviewFilters = {}) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [overview, setOverview] = useState<WorkspaceAdminsOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Using JSON.stringify for deep comparison of workspaceIds array
  const workspaceIdsStr = JSON.stringify(filters.workspaceIds ?? []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, workspaceIdsStr, filters.status, filters.membershipActive, limit]);

  const setLimitAndResetPage = useCallback((nextLimit: number) => {
    setPage(1);
    setLimit(nextLimit);
  }, []);

  const reload = useCallback(async () => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    try {
      const query = buildTableQuery(
        page,
        debouncedSearch,
        {
          ...(filters.workspaceIds && filters.workspaceIds.length > 0
            ? { workspaceIds: filters.workspaceIds.join(",") }
            : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.membershipActive !== undefined
            ? { membershipActive: String(filters.membershipActive) }
            : {})
        },
        limit
      );
      const data = await api<WorkspaceAdminsOverviewDto>(
        `${ROUTES.TENANTS.WORKSPACE_ADMINS_OVERVIEW}?${query}`,
        { workspaceId: ws }
      );
      setOverview(data);
    } catch {
      setOverview(null);
      setError("Could not load workspace admins.");
    } finally {
      setLoading(false);
    }
  }, [ws, page, limit, debouncedSearch, workspaceIdsStr, filters.status, filters.membershipActive]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    overview,
    admins: overview?.admins ?? [],
    summary: overview?.summary ?? null,
    page,
    setPage,
    search,
    setSearch,
    total: overview?.total ?? 0,
    totalPages: overview?.totalPages ?? 0,
    limit,
    setLimit: setLimitAndResetPage,
    loading,
    error,
    reload
  };
}
