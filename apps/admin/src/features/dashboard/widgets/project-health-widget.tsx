"use client";

import type { DashboardReportDto } from "@chronomint/contracts";
import { ROUTES } from "@chronomint/contracts";
import { ProjectColorDot } from "@chronomint/ui";
import { AlertCircle, CheckCircle, Info, Flame } from "lucide-react";
import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface ProjectHealthWidgetProps {
  report: DashboardReportDto;
}

interface ProjectHealthData {
  projectId: string;
  projectName: string;
  projectColor: string;
  totalHours: number;
  billableHours: number;
  revenue: number;
  budgetHours: number | null;
  percentUsed: number | null;
  status: "no_budget" | "over_budget" | "near_budget" | "on_track";
}

export function ProjectHealthWidget({ report }: ProjectHealthWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [healthData, setHealthData] = useState<ProjectHealthData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjectBudgets = useCallback(async () => {
    if (!ws || !report.timeByProject || report.timeByProject.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const budgetPromises = report.timeByProject.map(async (p) => {
        try {
          const budgetRes = await api<{
            budgetHours: number | null;
            percentUsed: number | null;
            status: "no_budget" | "over_budget" | "near_budget" | "on_track";
          }>(ROUTES.REPORTING.BUDGET(p.projectId), { workspaceId: ws });

          return {
            projectId: p.projectId,
            projectName: p.projectName,
            projectColor: (p as any).projectColor || "#6366f1",
            totalHours: p.totalHours,
            billableHours: p.billableHours,
            revenue: p.billableAmount,
            budgetHours: budgetRes.budgetHours,
            percentUsed: budgetRes.percentUsed,
            status: budgetRes.status
          };
        } catch {
          return {
            projectId: p.projectId,
            projectName: p.projectName,
            projectColor: "#6366f1",
            totalHours: p.totalHours,
            billableHours: p.billableHours,
            revenue: p.billableAmount,
            budgetHours: null,
            percentUsed: null,
            status: "no_budget" as const
          };
        }
      });

      const results = await Promise.all(budgetPromises);
      setHealthData(results);
    } catch (e) {
      console.error("Failed to load project health budgets", e);
    } finally {
      setLoading(false);
    }
  }, [ws, report.timeByProject]);

  useEffect(() => {
    void fetchProjectBudgets();
  }, [fetchProjectBudgets]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground animate-pulse py-6">
        Calculating project health...
      </div>
    );
  }

  if (healthData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground py-6">
        No active projects found.
      </div>
    );
  }

  const statusConfigs = {
    no_budget: {
      label: "No Budget",
      color: "text-muted-foreground bg-muted/50 border-muted-foreground/10",
      icon: Info
    },
    on_track: {
      label: "On Track",
      color: "text-green-700 bg-green-500/10 border-green-500/20",
      icon: CheckCircle
    },
    near_budget: {
      label: "Near Limit",
      color: "text-amber-700 bg-amber-500/10 border-amber-500/20",
      icon: AlertCircle
    },
    over_budget: {
      label: "Over Budget",
      color: "text-red-700 bg-red-500/10 border-red-500/20",
      icon: Flame
    }
  };

  return (
    <div className="space-y-3 pr-1 h-full overflow-auto max-h-[300px]">
      <div className="flex flex-col gap-2">
        {healthData.map((project) => {
          const config = statusConfigs[project.status];
          const StatusIcon = config.icon;
          const progress = Math.min(100, project.percentUsed ?? 0);

          return (
            <div
              key={project.projectId}
              className="flex flex-col gap-1.5 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-background/80 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <ProjectColorDot color={project.projectColor} size="sm" />
                  <span className="font-semibold text-xs text-foreground truncate max-w-[150px]">
                    {project.projectName}
                  </span>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold flex items-center gap-1 ${config.color}`}
                >
                  <StatusIcon className="size-2.5" />
                  {config.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground py-1">
                <div>
                  <span className="block font-medium text-foreground">
                    {project.totalHours.toFixed(1)} hrs
                  </span>
                  <span>Logged Time</span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">
                    ${project.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span>Revenue</span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">
                    {project.budgetHours ? `${project.budgetHours} h` : "—"}
                  </span>
                  <span>Capacity</span>
                </div>
              </div>

              {project.budgetHours !== null && (
                <div className="space-y-1">
                  <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        project.status === "over_budget"
                          ? "bg-red-500"
                          : project.status === "near_budget"
                            ? "bg-amber-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>{project.percentUsed}% consumed</span>
                    <span>{(project.budgetHours - project.totalHours).toFixed(1)} hrs left</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProjectHealthWidget;
