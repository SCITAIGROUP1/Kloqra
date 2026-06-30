"use client";

import { ROUTES, type ProjectDto } from "@kloqra/contracts";
import { Card, CardContent, CardHeader, CardTitle, ProjectColorDot, Skeleton } from "@kloqra/ui";
import { fetchListItems } from "@kloqra/web-shared";
import { AlertTriangle, CheckCircle, TrendingUp, Info } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { budgetBarColor } from "./budget-burndown-utils";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface BudgetData {
  projectId: string;
  projectName: string;
  projectColor: string;
  budgetHours: number | null;
  totalLoggedHours: number;
  percentUsed: number | null;
  status: "no_budget" | "over_budget" | "near_budget" | "on_track";
  burnDown: Array<{
    date: string;
    hoursLogged: number;
    cumulativeHours: number;
    budgetRemaining: number | null;
  }>;
}

export function BudgetBurnDownWidget({
  projectId,
  cardless = false,
  onHeaderActions
}: {
  projectId?: string | string[];
  cardless?: boolean;
  onHeaderActions?: (actions: React.ReactNode) => void;
}) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [data, setData] = useState<BudgetData | null>(null);
  const [allProjectsData, setAllProjectsData] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBudget = useCallback(async () => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    try {
      const singleId = Array.isArray(projectId)
        ? projectId.length === 1
          ? projectId[0]
          : undefined
        : projectId;

      if (singleId) {
        const res = await api<BudgetData>(ROUTES.REPORTING.BUDGET(singleId), {
          workspaceId: ws
        });
        setData(res);
        setAllProjectsData([]);
      } else {
        // Fetch budgets for all projects
        const projects = await fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, {
          workspaceId: ws
        });
        const targetProjects = Array.isArray(projectId)
          ? projects.filter((p) => projectId.includes(p.id))
          : projects;
        const budgetPromises = targetProjects
          .filter((p) => p.budgetHours !== null)
          .map((p) =>
            api<BudgetData>(ROUTES.REPORTING.BUDGET(p.id), { workspaceId: ws }).catch(() => null)
          );
        const results = await Promise.all(budgetPromises);
        setAllProjectsData(results.filter((r): r is BudgetData => r !== null));
        setData(null);
      }
    } catch {
      setError("Failed to load budget burn-down data");
    } finally {
      setLoading(false);
    }
  }, [ws, projectId]);

  const headerActionsNode = useMemo(() => {
    if (data && data.budgetHours !== null) {
      return (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${
            data.status === "no_budget"
              ? "text-muted-foreground bg-muted border-muted-foreground/15"
              : data.status === "on_track"
                ? "text-status-success-fg bg-status-success-bg border-status-success-border"
                : data.status === "near_budget"
                  ? "text-status-warning-fg bg-status-warning-bg border-status-warning-border"
                  : "text-status-danger-fg bg-status-danger-bg border-status-danger-border"
          }`}
        >
          {data.status === "on_track"
            ? "On Track"
            : data.status === "near_budget"
              ? "Near Budget"
              : "Over Budget"}
        </span>
      );
    }
    if (allProjectsData.length > 0) {
      const targetHours = allProjectsData.reduce((sum, p) => sum + (p.budgetHours ?? 0), 0);
      return (
        <span className="text-[10px] font-medium text-muted-foreground">
          Target: {targetHours.toFixed(0)} hrs
        </span>
      );
    }
    return null;
  }, [data, allProjectsData]);

  useEffect(() => {
    void fetchBudget();
  }, [fetchBudget]);

  useEffect(() => {
    if (cardless && onHeaderActions && headerActionsNode) {
      onHeaderActions(headerActionsNode);
    }
  }, [cardless, onHeaderActions, headerActionsNode]);

  if (error) {
    if (cardless) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-destructive font-medium py-6">
          {error}
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-destructive font-medium">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    const loadingBody = (
      <div className="flex flex-col items-center justify-center gap-3 py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <p className="text-sm text-muted-foreground">Loading budget data…</p>
      </div>
    );
    if (cardless) {
      return loadingBody;
    }
    return (
      <Card>
        <CardContent>{loadingBody}</CardContent>
      </Card>
    );
  }

  if (projectId && data) {
    const { projectName, projectColor, budgetHours, totalLoggedHours, percentUsed, status } = data;

    if (budgetHours === null) {
      if (cardless) {
        return (
          <div className="flex h-full items-center gap-3 text-sm text-muted-foreground py-4">
            <Info className="size-4 text-muted-foreground shrink-0" />
            <span>No budget set for this project. Edit project settings to set a budget.</span>
          </div>
        );
      }
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ProjectColorDot color={projectColor} />
              <span>Budget: {projectName}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <Info className="size-4 text-muted-foreground" />
            No budget set for this project. Edit project settings to set a budget.
          </CardContent>
        </Card>
      );
    }

    const statusConfigs = {
      no_budget: {
        label: "No Budget",
        color: "text-muted-foreground bg-muted border-muted-foreground/15",
        icon: Info
      },
      on_track: {
        label: "On Track",
        color: "text-status-success-fg bg-status-success-bg border-status-success-border",
        icon: CheckCircle
      },
      near_budget: {
        label: "Near Budget (>90%)",
        color: "text-status-warning-fg bg-status-warning-bg border-status-warning-border",
        icon: AlertTriangle
      },
      over_budget: {
        label: "Over Budget",
        color: "text-status-danger-fg bg-status-danger-bg border-status-danger-border",
        icon: AlertTriangle
      }
    };

    const config = statusConfigs[status];
    const StatusIcon = config.icon;

    if (cardless) {
      return (
        <div className="space-y-4 pt-1 flex flex-col justify-center h-full">
          <div className="flex justify-between items-baseline">
            <div>
              <p className="text-2xl font-bold tracking-tight">
                {totalLoggedHours.toFixed(1)}{" "}
                <span className="text-xs font-medium text-muted-foreground">
                  / {budgetHours} hrs
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {percentUsed !== null ? `${percentUsed}% of budget consumed` : ""}
              </p>
            </div>
            {percentUsed !== null && (
              <span
                className={`text-lg font-bold ${status === "over_budget" ? "text-destructive" : status === "near_budget" ? "text-status-warning-fg" : "text-primary"}`}
              >
                {percentUsed}%
              </span>
            )}
          </div>

          <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden border">
            <div
              className={`h-full transition-all duration-500 ${budgetBarColor(percentUsed ?? 0)}`}
              style={{ width: `${Math.min(100, percentUsed ?? 0)}%` }}
            />
          </div>

          {status !== "over_budget" && percentUsed && percentUsed > 0 && (
            <p className="text-[11px] text-muted-foreground leading-relaxed flex items-center gap-1.5 mt-1">
              <TrendingUp className="size-3.5 text-primary shrink-0" />
              <span>
                Project is trending {status === "near_budget" ? "close to" : "on track for"} budget
                capacity.
              </span>
            </p>
          )}
        </div>
      );
    }

    return (
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <ProjectColorDot color={projectColor} />
            <span>Budget Burn-down: {projectName}</span>
          </CardTitle>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${config.color}`}
          >
            <StatusIcon className="size-3 shrink-0" />
            {config.label}
          </span>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="flex justify-between items-baseline">
            <div>
              <p className="text-2xl font-bold tracking-tight">
                {totalLoggedHours.toFixed(1)}{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  / {budgetHours} hrs
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {percentUsed !== null ? `${percentUsed}% of budget consumed` : ""}
              </p>
            </div>
            {percentUsed !== null && (
              <span
                className={`text-xl font-bold ${status === "over_budget" ? "text-destructive" : status === "near_budget" ? "text-status-warning-fg" : "text-primary"}`}
              >
                {percentUsed}%
              </span>
            )}
          </div>

          <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden border">
            <div
              className={`h-full transition-all duration-500 ${budgetBarColor(percentUsed ?? 0)}`}
              style={{ width: `${Math.min(100, percentUsed ?? 0)}%` }}
            />
          </div>

          {status !== "over_budget" && percentUsed && percentUsed > 0 && (
            <p className="text-xs text-muted-foreground leading-relaxed flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-primary" />
              Project is trending {status === "near_budget" ? "close to" : "on track for"} its
              budget capacity.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (allProjectsData.length > 0) {
    if (cardless) {
      return (
        <div className="space-y-3 min-w-0 h-full overflow-auto">
          <div className="flex min-w-0 flex-col gap-2.5">
            {allProjectsData.map((p) => {
              const pct = p.percentUsed ?? 0;

              return (
                <div key={p.projectId} className="min-w-0 space-y-1">
                  <div className="flex min-w-0 items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5 font-medium">
                      <ProjectColorDot color={p.projectColor} size="sm" />
                      <span className="truncate">{p.projectName}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {p.totalLoggedHours.toFixed(1)} / {p.budgetHours} h ({pct}%)
                    </span>
                  </div>
                  <div className="w-full min-w-0 overflow-hidden rounded-full bg-muted/40 h-1.5">
                    <div
                      className={`h-full transition-all duration-500 ${budgetBarColor(pct)}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight text-muted-foreground">
            Workspace Project Budgets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="flex flex-col gap-3">
            {allProjectsData.map((p) => {
              const pct = p.percentUsed ?? 0;

              return (
                <div key={p.projectId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium">
                      <ProjectColorDot color={p.projectColor} size="sm" />
                      {p.projectName}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {p.totalLoggedHours.toFixed(1)} / {p.budgetHours} h ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${budgetBarColor(pct)}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
