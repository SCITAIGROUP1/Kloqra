"use client";

import { ROUTES } from "@kloqra/contracts";
import type { TeamMemberOverviewDto, TeamMembersOverviewDto } from "@kloqra/contracts";
import { buildTableQuery } from "@kloqra/web-shared";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useTeamMembersOverview(workspaceId: string) {
  const [page, setPage] = useState(1);
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
  }, [debouncedSearch]);

  const reload = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const query = buildTableQuery(page, debouncedSearch);
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
  }, [workspaceId, page, debouncedSearch]);

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
    limit: overview?.limit ?? 20,
    loading,
    error,
    reload
  };
}
