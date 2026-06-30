"use client";

import { ROUTES, DEFAULT_TABLE_PAGE_SIZE } from "@kloqra/contracts";
import type { TeamMemberOverviewDto, TeamMembersOverviewDto } from "@kloqra/contracts";
import { buildTableQuery } from "@kloqra/web-shared";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type TeamMembersOverviewFilters = {
  role?: "ADMIN" | "MEMBER";
  status?: "active" | "inactive";
  membershipActive?: boolean;
};

export function useTeamMembersOverview(
  workspaceId: string,
  filters: TeamMembersOverviewFilters = {}
) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [overview, setOverview] = useState<TeamMembersOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.role, filters.status, filters.membershipActive, limit]);

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
          ...(filters.role ? { role: filters.role } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.membershipActive !== undefined
            ? { membershipActive: String(filters.membershipActive) }
            : {})
        },
        limit
      );
      const data = await api<TeamMembersOverviewDto>(
        `${ROUTES.WORKSPACES.MEMBERS_OVERVIEW(workspaceId)}?${query}`,
        { workspaceId }
      );
      setOverview(data);
    } catch {
      setOverview(null);
      setError("Could not load team members.");
    } finally {
      setLoading(false);
    }
  }, [
    workspaceId,
    page,
    limit,
    debouncedSearch,
    filters.role,
    filters.status,
    filters.membershipActive
  ]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    overview,
    members: overview?.members ?? ([] as TeamMemberOverviewDto[]),
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
