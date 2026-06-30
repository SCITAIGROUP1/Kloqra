"use client";

import { ROUTES } from "@kloqra/contracts";
import type { PresenceSnapshotDto, TeamMembersOverviewDto } from "@kloqra/contracts";
import { buildListQuery } from "@kloqra/web-shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildTeamLiveMembers,
  countTeamLiveStatuses,
  filterTeamLiveMembers,
  type TeamLiveMember,
  type TeamLiveStatusFilter
} from "./team-live-status";
import { api } from "@/lib/api";

const POLL_MS = 5_000;

export function useTeamLive(workspaceId: string) {
  const [members, setMembers] = useState<TeamLiveMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TeamLiveStatusFilter>("all");
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const query = buildListQuery({ page: 1, search: "" });
      const [overview, snapshot] = await Promise.all([
        api<TeamMembersOverviewDto>(`${ROUTES.WORKSPACES.MEMBERS_OVERVIEW(workspaceId)}?${query}`, {
          workspaceId
        }),
        api<PresenceSnapshotDto>(ROUTES.PRESENCE.SNAPSHOT, { workspaceId })
      ]);
      setMembers(buildTeamLiveMembers(overview.members, snapshot.members));
      setError(null);
    } catch {
      setMembers([]);
      setError("Could not load team live data.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  const counts = useMemo(() => countTeamLiveStatuses(members), [members]);
  const filteredMembers = useMemo(
    () => filterTeamLiveMembers(members, search, statusFilter),
    [members, search, statusFilter]
  );

  return {
    members: filteredMembers,
    counts,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    now,
    reload: refresh
  };
}
