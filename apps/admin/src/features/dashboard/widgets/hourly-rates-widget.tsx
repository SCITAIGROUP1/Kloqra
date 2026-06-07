"use client";

import { ROUTES } from "@chronomint/contracts";
import type { HourlyRateDto, ProjectDto, WorkspaceMemberDto } from "@chronomint/contracts";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@chronomint/ui";
import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function HourlyRatesWidget() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [rates, setRates] = useState<HourlyRateDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    try {
      const [ratesData, projectsData, membersData] = await Promise.all([
        api<HourlyRateDto[]>(ROUTES.BILLING.RATES, { workspaceId: ws }),
        api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).catch(() => []),
        api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(ws), { workspaceId: ws }).catch(
          () => []
        )
      ]);

      // Sort rates: Global defaults first, then projects, then users (newest first)
      const sortedRates = [...ratesData].sort((a, b) => {
        if (!a.projectId && !a.userId) return -1;
        if (!b.projectId && !b.userId) return 1;
        return new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime();
      });

      setRates(sortedRates);
      setProjects(projectsData);
      setMembers(membersData);
    } catch {
      setError("Failed to load hourly rates");
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground animate-pulse py-6">
        Loading hourly rates...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive font-medium py-6">
        {error}
      </div>
    );
  }

  function getScopeLabel(rate: HourlyRateDto) {
    if (rate.userId) {
      const member = members.find((m) => m.userId === rate.userId);
      return `Member: ${member?.userName ?? "Unknown Member"}`;
    }
    if (rate.projectId) {
      const project = projects.find((p) => p.id === rate.projectId);
      return `Project: ${project?.name ?? "Unknown Project"}`;
    }
    return "Global Default";
  }

  function formatDate(isoStr: string) {
    return new Date(isoStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  return (
    <div className="space-y-2 pr-1 h-full overflow-auto max-h-[220px]">
      {rates.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No hourly rates configured.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-semibold">Scope</TableHead>
              <TableHead className="text-xs font-semibold text-right">Rate</TableHead>
              <TableHead className="text-xs font-semibold text-right">Effective</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="text-xs py-1.5 font-medium">{getScopeLabel(r)}</TableCell>
                <TableCell className="text-right text-xs py-1.5 font-bold font-mono">
                  ${r.rate.toFixed(2)}/hr
                </TableCell>
                <TableCell className="text-right text-[10px] py-1.5 text-muted-foreground font-mono">
                  {formatDate(r.effectiveFrom)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default HourlyRatesWidget;
