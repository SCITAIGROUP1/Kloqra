"use client";

import {
  AppBar,
  AppBarSecondary,
  Card,
  CardContent,
  CenteredLoader,
  EmptyState,
  Input,
  SegmentedControl
} from "@kloqra/ui";
import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { TeamLiveMemberCard } from "./team-live-member-card";
import type { TeamLiveStatus, TeamLiveStatusFilter } from "./team-live-status";
import { TeamLiveStatusCard } from "./team-live-status-card";
import { useTeamLive } from "./use-team-live";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

const FILTER_OPTIONS: { value: TeamLiveStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "idle", label: "Idle" },
  { value: "break", label: "Break" },
  { value: "offline", label: "Offline" }
];

const STATUS_ORDER: TeamLiveStatus[] = ["active", "idle", "break", "offline"];

export function TeamPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { members, counts, loading, error, search, setSearch, statusFilter, setStatusFilter, now } =
    useTeamLive(ws);

  const lastErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      toast.error(error);
      lastErrorRef.current = error;
    }
    if (!error) {
      lastErrorRef.current = null;
    }
  }, [error]);

  return (
    <div className="space-y-6">
      <AppBar
        title="Team Live"
        description="Real-time team activity monitoring"
        secondary={
          <AppBarSecondary
            leading={
              <div className="relative w-full max-w-xl">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search team members or projects…"
                  className="h-10 pl-9"
                  aria-label="Search team members or projects"
                />
              </div>
            }
            trailing={
              <SegmentedControl
                value={statusFilter}
                onChange={setStatusFilter}
                options={FILTER_OPTIONS}
              />
            }
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATUS_ORDER.map((status) => (
          <TeamLiveStatusCard
            key={status}
            status={status}
            count={counts[status]}
            selected={statusFilter === status}
            onSelect={() => setStatusFilter(statusFilter === status ? "all" : status)}
          />
        ))}
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : loading ? (
        <Card className="border-primary/10 shadow-sm">
          <CardContent className="p-0">
            <CenteredLoader label="Loading team activity…" />
          </CardContent>
        </Card>
      ) : members.length === 0 ? (
        <EmptyState
          title="No team members match"
          description={
            search || statusFilter !== "all"
              ? "Try a different search or filter."
              : "Invite team members to start monitoring activity here."
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {members.map((member) => (
            <TeamLiveMemberCard key={member.userId} member={member} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
