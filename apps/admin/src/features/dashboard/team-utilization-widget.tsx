"use client";

import { ROUTES } from "@kloqra/contracts";
import type { UtilizationResponseDto } from "@kloqra/contracts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow
} from "@kloqra/ui";
import { buildListQuery } from "@kloqra/web-shared";
import { Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const WIDGET_PAGE_SIZE = 5;

export function TeamUtilizationWidget({
  from,
  to,
  userId,
  projectMemberIds,
  cardless = false,
  onHeaderActions
}: {
  from: string;
  to: string;
  userId?: string;
  projectMemberIds?: string[];
  cardless?: boolean;
  onHeaderActions?: (actions: React.ReactNode) => void;
}) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [data, setData] = useState<UtilizationResponseDto | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUtilization = useCallback(async () => {
    if (!ws || !from || !to) return;
    setLoading(true);
    setError(null);
    try {
      const query = buildListQuery({
        page,
        limit: projectMemberIds?.length ? 1000 : WIDGET_PAGE_SIZE,
        filters: {
          from,
          to,
          ...(userId ? { userId } : {})
        }
      });
      const res = await api<UtilizationResponseDto>(`${ROUTES.REPORTING.UTILIZATION}?${query}`, {
        workspaceId: ws
      });
      setData(res);
    } catch {
      setError("Failed to load team utilization report");
    } finally {
      setLoading(false);
    }
  }, [ws, from, to, page, userId, projectMemberIds]);

  useEffect(() => {
    setPage(1);
  }, [from, to, userId, projectMemberIds]);

  useEffect(() => {
    void fetchUtilization();
  }, [fetchUtilization]);

  const filteredMembers = useMemo(() => {
    if (!data) return [];
    if (projectMemberIds?.length) {
      return data.members.filter((m) => projectMemberIds.includes(m.userId));
    }
    return data.members;
  }, [data, projectMemberIds]);

  const headerActionsNode = useMemo(() => {
    if (!data) return null;
    return (
      <span className="rounded-full border bg-muted px-2 py-0.5 text-[10px] font-medium">
        Target: {data.targetHours.toFixed(1)} hrs in range
      </span>
    );
  }, [data]);

  useEffect(() => {
    if (cardless && onHeaderActions && headerActionsNode) {
      onHeaderActions(headerActionsNode);
    }
  }, [cardless, onHeaderActions, headerActionsNode]);

  if (loading) {
    if (cardless) {
      return (
        <div className="flex h-full items-center justify-center py-6 text-sm text-muted-foreground animate-pulse">
          Loading team utilization...
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground animate-pulse">
          Loading team utilization...
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    if (cardless) {
      return (
        <div className="flex h-full items-center justify-center py-6 text-sm font-medium text-destructive">
          {error || "No data available"}
        </div>
      );
    }
    return null;
  }

  const statusConfigs = {
    on_track: {
      label: "On Track",
      color:
        "text-green-700 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30",
      icon: CheckCircle2
    },
    low: {
      label: "Low",
      color:
        "text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30",
      icon: AlertCircle
    },
    critical: {
      label: "Critical",
      color: "text-red-700 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30",
      icon: AlertCircle
    }
  };

  const widgetContent =
    filteredMembers.length === 0 ? (
      <p className="py-4 text-center text-xs text-muted-foreground">No team members found.</p>
    ) : (
      <div className="space-y-0">
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader>
              <DataTableHeaderRow>
                <DataTableHead className="h-9 px-3">Member</DataTableHead>
                <DataTableHead className="h-9 px-3 text-right">Logged</DataTableHead>
                <DataTableHead className="h-9 px-3 text-right">Billable</DataTableHead>
                <DataTableHead className="h-9 px-3 text-right">Utilization</DataTableHead>
                <DataTableHead className="h-9 px-3 text-center">Status</DataTableHead>
              </DataTableHeaderRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((m) => {
                const config = statusConfigs[m.status];
                const StatusIcon = config.icon;

                return (
                  <TableRow key={m.userId} className="hover:bg-muted/30">
                    <DataTableCell className="px-3 py-2 text-xs font-medium">
                      {m.userName}
                    </DataTableCell>
                    <DataTableCell className="px-3 py-2 text-right font-mono text-xs">
                      {m.loggedHours.toFixed(1)}h
                    </DataTableCell>
                    <DataTableCell className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                      {m.billableHours.toFixed(1)}h
                    </DataTableCell>
                    <DataTableCell className="px-3 py-2 text-right font-mono text-xs font-bold">
                      {m.utilizationPct}%
                    </DataTableCell>
                    <DataTableCell className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.color}`}
                      >
                        <StatusIcon className="size-3" />
                        {config.label}
                      </span>
                    </DataTableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {!projectMemberIds?.length && data.totalPages > 1 ? (
          <TablePagination
            page={page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            onPageChange={setPage}
            disabled={loading}
          />
        ) : null}
      </div>
    );

  if (cardless) {
    return widgetContent;
  }

  return (
    <Card className="border-primary/10 shadow-sm transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-semibold tracking-tight text-muted-foreground">
          <span className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <span>Team Utilization ({data.expectedWeeklyHours}h expected/week)</span>
          </span>
          {headerActionsNode}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">{widgetContent}</CardContent>
    </Card>
  );
}
