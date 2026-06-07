"use client";

import { ROUTES } from "@chronomint/contracts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@chronomint/ui";
import { Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface MemberUtilization {
  userId: string;
  userName: string;
  loggedHours: number;
  billableHours: number;
  targetHours: number;
  utilizationPct: number;
  status: "on_track" | "low" | "critical";
}

interface UtilizationData {
  period: { from: string; to: string };
  expectedWeeklyHours: number;
  targetHours: number;
  members: MemberUtilization[];
}

export function TeamUtilizationWidget({
  from,
  to,
  cardless = false,
  onHeaderActions
}: {
  from: string;
  to: string;
  cardless?: boolean;
  onHeaderActions?: (actions: React.ReactNode) => void;
}) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [data, setData] = useState<UtilizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUtilization = useCallback(async () => {
    if (!ws || !from || !to) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await api<UtilizationData>(`${ROUTES.REPORTING.UTILIZATION}?${params}`, {
        workspaceId: ws
      });
      setData(res);
    } catch {
      setError("Failed to load team utilization report");
    } finally {
      setLoading(false);
    }
  }, [ws, from, to]);

  useEffect(() => {
    void fetchUtilization();
  }, [fetchUtilization]);

  const headerActionsNode = useMemo(() => {
    if (!data) return null;
    return (
      <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full border font-medium">
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
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground animate-pulse py-6">
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
        <div className="flex h-full items-center justify-center text-sm text-destructive font-medium py-6">
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
    data.members.length === 0 ? (
      <p className="text-xs text-muted-foreground py-4 text-center">No team members found.</p>
    ) : (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-semibold">Member</TableHead>
              <TableHead className="text-xs font-semibold text-right">Logged</TableHead>
              <TableHead className="text-xs font-semibold text-right">Billable</TableHead>
              <TableHead className="text-xs font-semibold text-right">Utilization</TableHead>
              <TableHead className="text-xs font-semibold text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.members.map((m) => {
              const config = statusConfigs[m.status];
              const StatusIcon = config.icon;

              return (
                <TableRow key={m.userId} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-xs py-2">{m.userName}</TableCell>
                  <TableCell className="text-right text-xs py-2 font-mono">
                    {m.loggedHours.toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-right text-xs py-2 text-muted-foreground font-mono">
                    {m.billableHours.toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-right text-xs py-2 font-bold font-mono">
                    {m.utilizationPct}%
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${config.color}`}
                    >
                      <StatusIcon className="size-3" />
                      {config.label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );

  if (cardless) {
    return widgetContent;
  }

  return (
    <Card className="transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight text-muted-foreground flex items-center justify-between">
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
