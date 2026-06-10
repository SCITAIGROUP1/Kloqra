"use client";

import { ROUTES } from "@kloqra/contracts";
import type { HourlyRateDto, ProjectDto, WorkspaceMemberDto } from "@kloqra/contracts";
import {
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow
} from "@kloqra/ui";
import { fetchListItems, fetchPaginatedList } from "@kloqra/web-shared";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface HourlyRatesWidgetProps {
  projectId?: string;
  userId?: string;
}

const WIDGET_PAGE_SIZE = 5;

export function HourlyRatesWidget({ projectId, userId }: HourlyRatesWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [rates, setRates] = useState<HourlyRateDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      ...(projectId ? { projectId } : {}),
      ...(userId ? { userId } : {})
    }),
    [projectId, userId]
  );

  const fetchData = useCallback(async () => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    try {
      const [ratesData, projectsData, membersData] = await Promise.all([
        fetchPaginatedList<HourlyRateDto>(ROUTES.BILLING.RATES, {
          workspaceId: ws,
          page,
          limit: WIDGET_PAGE_SIZE,
          filters
        }),
        fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).catch(() => []),
        api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(ws), { workspaceId: ws }).catch(
          () => []
        )
      ]);

      setRates(ratesData.items);
      setTotal(ratesData.total);
      setTotalPages(ratesData.totalPages);
      setProjects(projectsData);
      setMembers(membersData);
    } catch {
      setError("Failed to load hourly rates");
    } finally {
      setLoading(false);
    }
  }, [ws, page, filters]);

  useEffect(() => {
    setPage(1);
  }, [projectId, userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-6 text-sm text-muted-foreground animate-pulse">
        Loading hourly rates...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center py-6 text-sm font-medium text-destructive">
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
    <div className="flex h-full max-h-[220px] flex-col pr-1">
      {rates.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No hourly rates configured.
        </p>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="text-xs">
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead className="h-9 px-3">Scope</DataTableHead>
                  <DataTableHead className="h-9 px-3 text-right">Rate</DataTableHead>
                  <DataTableHead className="h-9 px-3 text-right">Effective</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {rates.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <DataTableCell className="px-3 py-2 text-xs font-medium">
                      {getScopeLabel(r)}
                    </DataTableCell>
                    <DataTableCell className="px-3 py-2 text-right font-mono text-xs font-bold">
                      ${r.rate.toFixed(2)}/hr
                    </DataTableCell>
                    <DataTableCell className="px-3 py-2 text-right font-mono text-[10px] text-muted-foreground">
                      {formatDate(r.effectiveFrom)}
                    </DataTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 ? (
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={WIDGET_PAGE_SIZE}
              onPageChange={setPage}
              disabled={loading}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

export default HourlyRatesWidget;
