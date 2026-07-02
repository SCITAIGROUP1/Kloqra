"use client";

import { ROUTES, DEFAULT_TABLE_PAGE_SIZE } from "@kloqra/contracts";
import type { ProjectManagersOverviewDto } from "@kloqra/contracts";
import { buildTableQuery } from "@kloqra/web-shared";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type ProjectManagersOverviewFilters = {
  projectId?: string;
  status?: "active" | "inactive";
  membershipActive?: boolean;
  assignmentActive?: boolean;
};

export function useProjectManagersOverview(
  workspaceId: string,
  filters: ProjectManagersOverviewFilters = {}
) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [overview, setOverview] = useState<ProjectManagersOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filters.projectId,
    filters.status,
    filters.membershipActive,
    filters.assignmentActive,
    limit
  ]);

  const setLimitAndResetPage = useCallback((nextLimit: number) => {
    setPage(1);
    setLimit(nextLimit);
  }, []);

  const reload = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const query = buildTableQuery(
        page,
        debouncedSearch,
        {
          ...(filters.projectId ? { projectId: filters.projectId } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.membershipActive !== undefined
            ? { membershipActive: String(filters.membershipActive) }
            : {}),
          ...(filters.assignmentActive !== undefined
            ? { assignmentActive: String(filters.assignmentActive) }
            : {})
        },
        limit
      );
      const data = await api<ProjectManagersOverviewDto>(
        `${ROUTES.WORKSPACES.PROJECT_MANAGERS_OVERVIEW(workspaceId)}?${query}`,
        { workspaceId }
      );
      setOverview(data);
    } catch {
      setOverview(null);
      setError("Could not load project managers.");
    } finally {
      setLoading(false);
    }
  }, [
    workspaceId,
    page,
    limit,
    debouncedSearch,
    filters.projectId,
    filters.status,
    filters.membershipActive,
    filters.assignmentActive
  ]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    overview,
    managers: overview?.managers ?? [],
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
