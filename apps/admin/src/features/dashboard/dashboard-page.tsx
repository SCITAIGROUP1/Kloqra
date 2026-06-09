"use client";

import { DEFAULT_EXPORT_COLUMNS, ROUTES } from "@chronomint/contracts";
import type {
  CategoryDto,
  DashboardReportDto,
  ProjectDto,
  TaskDto,
  TeamDto
} from "@chronomint/contracts";
import {
  Button,
  Card,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input
} from "@chronomint/ui";
import { toDateInputValue, ReportScopeFilters } from "@chronomint/web-shared";
import { LayoutGrid, Move, RotateCcw, Check } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import { toast } from "sonner";
import { BudgetBurnDownWidget } from "./budget-burndown-widget";
import { TeamUtilizationWidget } from "./team-utilization-widget";
import { useWidgetLayout } from "./use-widget-layout";
import { WidgetControlPanel } from "./widget-control-panel";
import { WIDGET_REGISTRY } from "./widget-registry";
import { WidgetShell } from "./widget-shell";
import { ActiveTimersWidget } from "./widgets/active-timers-widget";
import { BillabilityGaugeWidget } from "./widgets/billability-gauge-widget";
import { BillableSplitDonutWidget } from "./widgets/billable-split-donut-widget";
import { CategoryProjectHeatmapWidget } from "./widgets/category-project-heatmap-widget";
import { HeatmapWidget } from "./widgets/heatmap-widget";
import { HourlyRatesWidget } from "./widgets/hourly-rates-widget";
import { LivePresenceWidget } from "./widgets/live-presence-widget";
import { MemberLeaderboardWidget } from "./widgets/member-leaderboard-widget";
import { PendingTimesheetsWidget } from "./widgets/pending-timesheets-widget";
import { ProjectHealthWidget } from "./widgets/project-health-widget";
import { RateEfficiencyWidget } from "./widgets/rate-efficiency-widget";
import { RevenueTrendWidget } from "./widgets/revenue-trend-widget";
import { TaskBreakdownWidget } from "./widgets/task-breakdown-widget";
import {
  DashboardSkeleton,
  EmptyState,
  PageHeader,
  SegmentedControl,
  StatCard
} from "@/components/admin-page";
import {
  DailyStackedBarChart,
  ReportDonutChart,
  ReportBreakdownTable,
  WeeklyBarChart,
  RevenueByProjectChart,
  HoursByMemberChart
} from "@/components/charts-lazy";
import { LivePresenceBadge } from "@/components/live-presence-badge";
import { formatDurationClock } from "@/components/report-charts";
import { api } from "@/lib/api";
import { apiDownloadPost, saveDownloadResponse } from "@/lib/download";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

// Types
type RangeDays = 7 | 30 | 90;
type ChartByMode = "billability" | "project";
type GroupByMode = "user" | "project";

const ResponsiveGridLayout = WidthProvider(Responsive);

const RANGE_OPTIONS: { value: RangeDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" }
];

function rangeQuery(
  start: string,
  end: string,
  filters?: { projectId?: string; userId?: string; categoryId?: string; taskId?: string }
) {
  const from = new Date(start + "T00:00:00");
  const to = new Date(end + "T23:59:59.999");
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString()
  });
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.userId) params.set("userId", filters.userId);
  if (filters?.categoryId) params.set("categoryId", filters.categoryId);
  if (filters?.taskId) params.set("taskId", filters.taskId);
  return params;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DashboardPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [range, setRange] = useState<RangeDays | "">(7);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toDateInputValue(d);
  });
  const [endDate, setEndDate] = useState<string>(() => toDateInputValue(new Date()));
  const [projectId, setProjectId] = useState("");
  const [userId, setUserId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamDto["members"]>([]);
  const [report, setReport] = useState<DashboardReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  function handleRangePresetChange(newRange: RangeDays) {
    setRange(newRange);
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - newRange);
    setStartDate(toDateInputValue(from));
    setEndDate(toDateInputValue(to));
  }

  function handleCustomDateChange(newStart: string, newEnd: string) {
    setStartDate(newStart);
    setEndDate(newEnd);

    // Check if it matches a preset
    const todayStr = toDateInputValue(new Date());
    if (newEnd === todayStr) {
      const fromDate = new Date(newStart + "T12:00:00");
      const toDate = new Date(newEnd + "T12:00:00");
      const diffTime = toDate.getTime() - fromDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 7 || diffDays === 30 || diffDays === 90) {
        setRange(diffDays as RangeDays);
        return;
      }
    }
    setRange("");
  }

  // Widget Customization UI States
  const [mounted, setMounted] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isArranging, setIsArranging] = useState(false);
  const [widgetHeaderActions, setWidgetHeaderActions] = useState<Record<string, React.ReactNode>>(
    {}
  );

  // Widget Local Grouping/Config States
  const [dailyChartBy, setDailyChartBy] = useState<ChartByMode>("billability");
  const [breakdownGroupBy, setBreakdownGroupBy] = useState<GroupByMode>("user");
  const [distributionGroupBy, setDistributionGroupBy] = useState<GroupByMode>("user");

  // Layout Store Selectors
  const layoutsByWorkspace = useWidgetLayout((s) => s.layoutsByWorkspace);
  const initialized = useWidgetLayout((s) => s.initialized);
  const initialize = useWidgetLayout((s) => s.initialize);
  const updateLayout = useWidgetLayout((s) => s.updateLayout);
  const toggleWidget = useWidgetLayout((s) => s.toggleWidget);
  const resetLayout = useWidgetLayout((s) => s.resetLayout);

  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedMember = teamMembers.find((m) => m.userId === userId);
  const selectedTask = tasks.find((t) => t.id === taskId);

  const scopeLabel = selectedTask
    ? `${selectedTask.taskName} · ${selectedProject!.name}`
    : selectedMember
      ? `${selectedMember.userName} · ${selectedProject!.name}`
      : selectedProject
        ? selectedProject.name
        : "All workspace";

  // Prevent SSR layout hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!ws) return;
    api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
    api<CategoryDto[]>(ROUTES.CATEGORIES.LIST, { workspaceId: ws }).then(setCategories);
  }, [ws]);

  useEffect(() => {
    if (!ws || !projectId) {
      setTeamMembers([]);
      setTasks([]);
      setUserId("");
      setTaskId("");
      return;
    }
    api<TeamDto>(ROUTES.PROJECTS.TEAM(projectId), { workspaceId: ws })
      .then((team) => setTeamMembers(team.members))
      .catch(() => setTeamMembers([]));

    const params = new URLSearchParams({ projectId });
    if (categoryId) params.set("categoryId", categoryId);
    api<TaskDto[]>(`${ROUTES.TASKS.LIST}?${params}`, { workspaceId: ws })
      .then(setTasks)
      .catch(() => setTasks([]));
  }, [ws, projectId, categoryId]);

  useEffect(() => {
    if (!userId) return;
    if (!teamMembers.some((m) => m.userId === userId)) {
      setUserId("");
    }
  }, [teamMembers, userId]);

  useEffect(() => {
    if (!taskId) return;
    if (!tasks.some((t) => t.id === taskId)) {
      setTaskId("");
    }
  }, [tasks, taskId]);

  // Initialize Layout from Store
  useEffect(() => {
    if (ws) {
      initialize(ws);
    }
  }, [ws, initialize]);

  // Handle Keyboard Escape shortcut to close grid customizer
  useEffect(() => {
    if (!isCatalogOpen && !isArranging) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCatalogOpen(false);
        setIsArranging(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCatalogOpen, isArranging]);

  function onProjectChange(nextId: string) {
    setProjectId(nextId);
    setUserId("");
    setTaskId("");
  }

  function onCategoryChange(nextId: string) {
    setCategoryId(nextId);
    setTaskId("");
  }

  function clearScopeFilters() {
    setProjectId("");
    setUserId("");
    setCategoryId("");
    setTaskId("");
  }

  const load = useCallback(() => {
    if (!ws) return;
    setLoading(true);
    setError(null);
    api<DashboardReportDto>(
      `${ROUTES.REPORTING.DASHBOARD}?${rangeQuery(startDate, endDate, {
        projectId: projectId || undefined,
        userId: userId || undefined,
        categoryId: categoryId || undefined,
        taskId: taskId || undefined
      })}`,
      { workspaceId: ws }
    )
      .then(setReport)
      .catch(() => setError("Could not load analytics. Is the API running on port 3001?"))
      .finally(() => setLoading(false));
  }, [ws, startDate, endDate, projectId, userId, categoryId, taskId]);

  useEffect(() => {
    load();
  }, [load]);

  async function quickExport() {
    if (!ws) return;
    setExporting(true);
    try {
      const from = new Date(startDate + "T00:00:00");
      const to = new Date(endDate + "T23:59:59.999");
      const res = await apiDownloadPost(ROUTES.EXPORT.GENERATE, ws, {
        from: from.toISOString(),
        to: to.toISOString(),
        billable: "all",
        reportTypes: ["time_entries", "by_project"],
        format: "xlsx",
        columns: {
          time_entries: [...DEFAULT_EXPORT_COLUMNS.time_entries],
          by_project: [...DEFAULT_EXPORT_COLUMNS.by_project]
        },
        ...(projectId ? { projectId } : {}),
        ...(userId ? { userId } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(taskId ? { taskId } : {})
      });
      await saveDownloadResponse(res, "chronomint-dashboard-export.xlsx");
    } catch {
      setError("Quick export failed.");
    } finally {
      setExporting(false);
    }
  }

  const handleResetLayout = () => {
    resetLayout(ws);
    toast.success("Dashboard layout reset to default");
  };

  const updateHeaderAction = useCallback((id: string, node: React.ReactNode) => {
    setWidgetHeaderActions((prev) => {
      if (prev[id] === node) return prev;
      return { ...prev, [id]: node };
    });
  }, []);

  const handleBudgetBurndownActions = useCallback(
    (node: React.ReactNode) => {
      updateHeaderAction("budget_burndown", node);
    },
    [updateHeaderAction]
  );

  const handleTeamUtilizationActions = useCallback(
    (node: React.ReactNode) => {
      updateHeaderAction("team_utilization", node);
    },
    [updateHeaderAction]
  );

  const handlePendingTimesheetsActions = useCallback(
    (node: React.ReactNode) => {
      updateHeaderAction("pending_timesheets", node);
    },
    [updateHeaderAction]
  );

  const customizeHref = (() => {
    const params = new URLSearchParams({
      from: startDate,
      to: endDate
    });
    return `/exports?${params}`;
  })();

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Dashboard" description="Loading workspace analytics…" />
        <DashboardSkeleton />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-8">
        <PageHeader title="Dashboard" description="Workspace time and revenue overview." />
        <EmptyState
          title="Could not load reports"
          description={error ?? "No data returned from the API."}
          action={
            <Button variant="outline" onClick={load}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const colorByProjectId = Object.fromEntries(projects.map((p) => [p.id, p.color]));
  const hasData = report.workspace.totalHours > 0;
  const periodLabel = `${formatDate(report.period.from)} – ${formatDate(report.period.to)}`;

  // Widget Catalogue Render Lookup
  function renderWidgetContent(id: string) {
    switch (id) {
      case "stat_total_hours":
        return (
          <StatCard
            label="Total hours"
            value={formatDurationClock(report!.workspace.totalHours)}
            hint={`${report!.workspace.activeMembers} members active`}
            cardless
          />
        );
      case "stat_billable":
        return (
          <StatCard
            label="Billable"
            value={formatDurationClock(report!.workspace.billableHours)}
            hint={`${report!.workspace.billablePercent}% of total`}
            accent="billable"
            cardless
          />
        );
      case "stat_nonbillable":
        return (
          <StatCard
            label="Non-billable"
            value={formatDurationClock(report!.workspace.nonBillableHours)}
            accent="muted"
            cardless
          />
        );
      case "stat_revenue":
        return (
          <StatCard
            label="Revenue"
            value={`$${formatMoney(report!.workspace.totalAmount)}`}
            hint={report!.workspace.currency}
            accent="revenue"
            cardless
          />
        );
      case "stat_projects":
        return (
          <StatCard
            label="Projects"
            value={String(report!.workspace.activeProjects)}
            hint="With time logged"
            cardless
          />
        );
      case "stat_members":
        return (
          <StatCard
            label="Members"
            value={String(report!.workspace.activeMembers)}
            hint="With time logged"
            cardless
          />
        );
      case "budget_burndown":
        return (
          <BudgetBurnDownWidget
            projectId={projectId || undefined}
            cardless
            onHeaderActions={handleBudgetBurndownActions}
          />
        );
      case "team_utilization":
        return (
          <TeamUtilizationWidget
            from={report!.period.from}
            to={report!.period.to}
            userId={userId || undefined}
            projectMemberIds={projectId ? teamMembers.map((m) => m.userId) : undefined}
            cardless
            onHeaderActions={handleTeamUtilizationActions}
          />
        );
      case "daily_chart":
        return (
          <DailyStackedBarChart
            report={report!}
            chartBy={dailyChartBy}
            projectColors={colorByProjectId}
          />
        );
      case "weekly_chart":
        return <WeeklyBarChart report={report!} />;
      case "revenue_by_project":
        return <RevenueByProjectChart report={report!} projectColors={colorByProjectId} />;
      case "hours_by_member":
        return <HoursByMemberChart report={report!} />;
      case "breakdown_table":
        return (
          <ReportBreakdownTable
            report={report!}
            groupBy={breakdownGroupBy}
            projectColors={colorByProjectId}
          />
        );
      case "distribution_donut":
        return (
          <ReportDonutChart
            report={report!}
            groupBy={distributionGroupBy}
            projectColors={colorByProjectId}
          />
        );

      // Phase 6 - New Widget Implementation
      case "billability_gauge":
        return <BillabilityGaugeWidget report={report!} />;
      case "revenue_trend":
        return <RevenueTrendWidget report={report!} />;
      case "project_health":
        return <ProjectHealthWidget report={report!} />;
      case "member_leaderboard":
        return <MemberLeaderboardWidget report={report!} />;
      case "billable_split_donut":
        return <BillableSplitDonutWidget report={report!} />;
      case "hourly_rates":
        return (
          <HourlyRatesWidget projectId={projectId || undefined} userId={userId || undefined} />
        );
      case "live_presence":
        return (
          <LivePresenceWidget projectId={projectId || undefined} userId={userId || undefined} />
        );
      case "pending_timesheets":
        return (
          <PendingTimesheetsWidget
            projectId={projectId || undefined}
            userId={userId || undefined}
            onHeaderActions={handlePendingTimesheetsActions}
          />
        );
      case "time_of_day_heatmap":
        return (
          <HeatmapWidget
            from={startDate}
            to={endDate}
            projectId={projectId || undefined}
            userId={userId || undefined}
            categoryId={categoryId || undefined}
            taskId={taskId || undefined}
          />
        );
      case "category_distribution":
        return (
          <ReportDonutChart report={report!} groupBy="category" projectColors={colorByProjectId} />
        );
      case "category_breakdown":
        return (
          <ReportBreakdownTable
            report={report!}
            groupBy="category"
            projectColors={colorByProjectId}
          />
        );
      case "category_project_heatmap":
        return (
          <CategoryProjectHeatmapWidget
            from={startDate}
            to={endDate}
            projectId={projectId || undefined}
            userId={userId || undefined}
            categoryId={categoryId || undefined}
            taskId={taskId || undefined}
          />
        );
      case "task_breakdown":
        return (
          <TaskBreakdownWidget
            from={startDate}
            to={endDate}
            projectId={projectId || undefined}
            userId={userId || undefined}
            categoryId={categoryId || undefined}
            taskId={taskId || undefined}
          />
        );
      case "rate_efficiency":
        return <RateEfficiencyWidget report={report!} />;
      case "active_timers":
        return (
          <ActiveTimersWidget
            projectFilterName={
              projectId ? projects.find((p) => p.id === projectId)?.name : undefined
            }
            userId={userId || undefined}
          />
        );

      default:
        return (
          <div className="flex h-full flex-col items-center justify-center text-center p-4">
            <p className="text-xs font-semibold text-muted-foreground">Analytics Widget</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[185px]">
              This widget layout is not registered.
            </p>
          </div>
        );
    }
  }

  // Get dynamic header action controls (e.g. filters) per widget type
  function renderWidgetHeaderControls(id: string) {
    if (id === "daily_chart") {
      return (
        <div
          className="flex items-center gap-1.5 mr-1 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <Select value={dailyChartBy} onValueChange={(v) => setDailyChartBy(v as ChartByMode)}>
            <SelectTrigger className="h-6 w-24 text-[10px] px-2 py-0 bg-background/50 hover:bg-background border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="billability" className="text-[10px] py-1">
                Billability
              </SelectItem>
              <SelectItem value="project" className="text-[10px] py-1">
                Project
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (id === "breakdown_table") {
      return (
        <div
          className="flex items-center gap-1.5 mr-1 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <Select
            value={breakdownGroupBy}
            onValueChange={(v) => setBreakdownGroupBy(v as GroupByMode)}
          >
            <SelectTrigger className="h-6 w-20 text-[10px] px-2 py-0 bg-background/50 hover:bg-background border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user" className="text-[10px] py-1">
                User
              </SelectItem>
              <SelectItem value="project" className="text-[10px] py-1">
                Project
              </SelectItem>
              <SelectItem value="category" className="text-[10px] py-1">
                Category
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (id === "distribution_donut") {
      return (
        <div
          className="flex items-center gap-1.5 mr-1 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <Select
            value={distributionGroupBy}
            onValueChange={(v) => setDistributionGroupBy(v as GroupByMode)}
          >
            <SelectTrigger className="h-6 w-20 text-[10px] px-2 py-0 bg-background/50 hover:bg-background border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user" className="text-[10px] py-1">
                User
              </SelectItem>
              <SelectItem value="project" className="text-[10px] py-1">
                Project
              </SelectItem>
              <SelectItem value="category" className="text-[10px] py-1">
                Category
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Default returns any async-reported badge actions (like budget status or team target)
    return widgetHeaderActions[id] || null;
  }

  // Filter layouts
  const activeLayout = layoutsByWorkspace[ws] || [];
  const visibleItems = activeLayout.filter((item) => item.visible);

  return (
    <div className="space-y-8 min-h-screen pb-16">
      <PageHeader
        title="Dashboard"
        description={
          <>
            {scopeLabel} · {periodLabel}
            {selectedProject?.clientName && !selectedMember
              ? ` · ${selectedProject.clientName}`
              : null}
          </>
        }
        actions={
          <>
            <LivePresenceBadge />
            <Button
              size="sm"
              variant={isCatalogOpen ? "secondary" : "outline"}
              onClick={() => {
                setIsCatalogOpen(!isCatalogOpen);
                setIsArranging(false); // Close arrange bar if catalog is opened
              }}
              className="gap-1.5 text-xs h-9"
            >
              <LayoutGrid className="size-3.5" />
              {isCatalogOpen ? "Closing Catalog" : "Add Widgets"}
            </Button>
            <Button
              size="sm"
              variant={isArranging ? "secondary" : "outline"}
              onClick={() => {
                setIsArranging(!isArranging);
                setIsCatalogOpen(false); // Close catalog if arrange is opened
              }}
              className="gap-1.5 text-xs h-9"
            >
              <Move className="size-3.5" />
              {isArranging ? "Done Arranging" : "Arrange Grid"}
            </Button>
            <Button size="sm" variant="secondary" onClick={quickExport} disabled={exporting}>
              {exporting ? "Exporting…" : "Quick export"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={customizeHref}>Full export</Link>
            </Button>
          </>
        }
      />

      {/* Customize Toolbar Banner */}
      {isCatalogOpen && (
        <WidgetControlPanel
          layoutItems={activeLayout}
          onToggleWidget={(id) => toggleWidget(ws, id)}
          onResetLayout={handleResetLayout}
          onClose={() => setIsCatalogOpen(false)}
        />
      )}

      {isArranging && (
        <div className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/85 backdrop-blur-md shadow-sm animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex items-center justify-between px-6 py-3 max-w-[1600px] mx-auto">
            <div className="flex items-center gap-2">
              <Move className="size-4 text-primary animate-pulse" />
              <span className="text-sm font-semibold">Rearranging Layout</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono">
                Full-Width Edit Mode
              </span>
              <span className="text-[10px] text-muted-foreground hidden md:inline ml-2">
                Drag anywhere on a widget to move; drag edges or the corner to resize.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleResetLayout}
                className="h-8 gap-1.5 text-xs font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                <RotateCcw className="size-3.5" />
                Reset Layout
              </Button>
              <Button
                size="sm"
                onClick={() => setIsArranging(false)}
                className="h-8 gap-1.5 text-xs font-semibold shadow-sm"
              >
                <Check className="size-3.5" />
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Period</Label>
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                value={range as RangeDays}
                onChange={(v) => handleRangePresetChange(v)}
                options={RANGE_OPTIONS}
              />
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                  className="h-9 bg-background w-[145px] text-xs px-2.5"
                />
                <span className="text-muted-foreground text-xs font-medium">—</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                  className="h-9 bg-background w-[145px] text-xs px-2.5"
                />
              </div>
            </div>
          </div>

          <ReportScopeFilters
            compact
            taskRequiresProject
            memberRequiresProject
            memberAllLabel="Everyone on project"
            memberPlaceholder="Everyone on project"
            values={{ projectId, categoryId, taskId, userId }}
            projects={projects}
            categories={categories}
            tasks={tasks}
            members={teamMembers.map((m) => ({ userId: m.userId, userName: m.userName }))}
            onProjectChange={onProjectChange}
            onCategoryChange={onCategoryChange}
            onTaskChange={setTaskId}
            onUserChange={setUserId}
            onClearAll={clearScopeFilters}
          />
        </CardContent>
      </Card>

      {!hasData ? (
        <EmptyState
          title="No time in this period"
          description="Log time in the client app or seed demo data to see charts and breakdowns."
          action={<code className="rounded-md bg-muted px-2 py-1 text-xs">pnpm prisma:seed</code>}
        />
      ) : (
        <div className="relative">
          {!mounted || !initialized ? (
            <DashboardSkeleton />
          ) : (
            <ResponsiveGridLayout
              className={`layout -mx-4 ${isArranging ? "layout-customizing" : ""}`}
              layouts={{ lg: visibleItems }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={80}
              isDraggable={isArranging}
              isResizable={isArranging}
              draggableCancel="button, a, input, select, textarea, [role='menu'], [role='menuitem'], .widget-no-drag"
              resizeHandles={["s", "e", "se"]}
              onLayoutChange={(currentLayout) => {
                if (isArranging) {
                  updateLayout(ws, currentLayout);
                }
              }}
              margin={[16, 16]}
              containerPadding={[16, 0]}
            >
              {visibleItems.map((item) => {
                const widgetDef = WIDGET_REGISTRY.find((w) => w.id === item.i);
                const label = widgetDef?.label ?? "Widget";
                return (
                  <div key={item.i} className="w-full h-full">
                    <WidgetShell
                      id={item.i}
                      label={label}
                      isEditing={isArranging}
                      onHide={() => toggleWidget(ws, item.i)}
                      headerActions={renderWidgetHeaderControls(item.i)}
                    >
                      {renderWidgetContent(item.i)}
                    </WidgetShell>
                  </div>
                );
              })}
            </ResponsiveGridLayout>
          )}
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
