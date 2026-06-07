"use client";

import { ROUTES } from "@chronomint/contracts";
import { Card, CardContent, CardHeader, CardTitle, ProjectColorDot } from "@chronomint/ui";
import { AlertTriangle, CheckCircle, TrendingUp, Info } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
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
  projectId?: string;
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
      if (projectId) {
        const res = await api<BudgetData>(ROUTES.REPORTING.BUDGET(projectId), {
          workspaceId: ws
        });
        setData(res);
        setAllProjectsData([]);
      } else {
        // Fetch budgets for all projects
        const projects = await api<any[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws });
        const budgetPromises = projects
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
    if (!data || data.budgetHours === null) return null;
    return (
      <span
        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${
          data.status === "no_budget"
            ? "text-muted-foreground bg-muted border-muted-foreground/15"
            : data.status === "on_track"
              ? "text-green-700 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30"
              : data.status === "near_budget"
                ? "text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30"
                : "text-red-700 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30"
        }`}
      >
        {data.status === "on_track"
          ? "On Track"
          : data.status === "near_budget"
            ? "Near Budget"
            : "Over Budget"}
      </span>
    );
  }, [data]);

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
    if (cardless) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground animate-pulse py-6">
          Loading budget data...
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground animate-pulse">
          Loading budget data...
        </CardContent>
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
        color:
          "text-green-700 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30",
        icon: CheckCircle
      },
      near_budget: {
        label: "Near Budget (>90%)",
        color:
          "text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30",
        icon: AlertTriangle
      },
      over_budget: {
        label: "Over Budget",
        color: "text-red-700 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30",
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
                className={`text-lg font-bold ${status === "over_budget" ? "text-destructive" : status === "near_budget" ? "text-amber-500" : "text-primary"}`}
              >
                {percentUsed}%
              </span>
            )}
          </div>

          <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden border">
            <div
              className={`h-full transition-all duration-500 ${
                status === "over_budget"
                  ? "bg-red-500"
                  : status === "near_budget"
                    ? "bg-amber-500"
                    : "bg-primary"
              }`}
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
                className={`text-xl font-bold ${status === "over_budget" ? "text-destructive" : status === "near_budget" ? "text-amber-500" : "text-primary"}`}
              >
                {percentUsed}%
              </span>
            )}
          </div>

          <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden border">
            <div
              className={`h-full transition-all duration-500 ${
                status === "over_budget"
                  ? "bg-red-500"
                  : status === "near_budget"
                    ? "bg-amber-500"
                    : "bg-primary"
              }`}
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
        <div className="space-y-3 pr-1 h-full overflow-auto">
          <div className="flex flex-col gap-2.5">
            {allProjectsData.map((p) => {
              const pct = p.percentUsed ?? 0;
              const isOver = p.status === "over_budget";
              const isNear = p.status === "near_budget";

              return (
                <div key={p.projectId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium truncate max-w-[60%]">
                      <ProjectColorDot color={p.projectColor} size="sm" />
                      <span className="truncate">{p.projectName}</span>
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                      {p.totalLoggedHours.toFixed(1)} / {p.budgetHours} h ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isOver ? "bg-red-500" : isNear ? "bg-amber-500" : "bg-primary"
                      }`}
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
              const isOver = p.status === "over_budget";
              const isNear = p.status === "near_budget";

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
                      className={`h-full transition-all duration-500 ${
                        isOver ? "bg-red-500" : isNear ? "bg-amber-500" : "bg-primary"
                      }`}
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
