"use client";

import { ROUTES } from "@kloqra/contracts";
import type { UtilizationResponseDto } from "@kloqra/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@kloqra/ui";
import { buildListQuery } from "@kloqra/web-shared";
import { Users } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { TeamUtilizationTable, TeamUtilizationTargetBadge } from "./team-utilization-table";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const WIDGET_PAGE_SIZE = 5;

export function TeamUtilizationWidget({
  from,
  to,
  userId,
  projectId,
  categoryId,
  taskId,
  cardless = false,
  onHeaderActions
}: {
  from: string;
  to: string;
  userId?: string | string[];
  projectId?: string | string[];
  categoryId?: string;
  taskId?: string;
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
        limit: projectId ? 1000 : WIDGET_PAGE_SIZE,
        filters: {
          from,
          to,
          ...(userId ? { userId } : {}),
          ...(projectId ? { projectId } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(taskId ? { taskId } : {})
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
  }, [ws, from, to, page, userId, projectId, categoryId, taskId]);

  useEffect(() => {
    setPage(1);
  }, [from, to, userId, projectId, categoryId, taskId]);

  useEffect(() => {
    void fetchUtilization();
  }, [fetchUtilization]);

  const headerActionsNode = useMemo(() => {
    if (!data) return null;
    return <TeamUtilizationTargetBadge data={data} />;
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

  const widgetContent = (
    <TeamUtilizationTable
      data={data}
      page={page}
      onPageChange={setPage}
      showPagination={!projectId}
    />
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
