"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  CategoryDto,
  DashboardReportDto,
  ProjectDto,
  TaskDto,
  TeamMemberDto
} from "@kloqra/contracts";
import {
  AppBar,
  AppBarActionButton,
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  WidgetShell
} from "@kloqra/ui";
import {
  applyDashboardPeriodPreset,
  buildWidgetMinSizeMap,
  DashboardArrangeBanner,
  DashboardPeriodFilter,
  DASHBOARD_GRID_BREAKPOINTS,
  DASHBOARD_GRID_COLS,
  generateResponsiveLayouts,
  getEffectiveWorkspaceId,
  isPersistableDashboardBreakpoint,
  fetchProjectTeam,
  matchDashboardPeriodPreset,
  ReportScopeFilters,
  type DashboardBreakpoint,
  type DashboardPeriodPreset,
  type DashboardPeriodSelection,
  fetchListItems
} from "@kloqra/web-shared";
import { Clock, DollarSign, Folder, LayoutGrid, Move, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import { toast } from "sonner";
import { useWidgetLayout } from "./use-widget-layout";
import type { WidgetLayoutItem } from "./use-widget-layout";
import { WidgetControlPanel } from "./widget-control-panel";
import { WIDGET_REGISTRY } from "./widget-registry";
import {
  ActiveTimersWidget,
  BillabilityGaugeWidget,
  BillableSplitDonutWidget,
  BudgetBurnDownWidget,
  CategoryProjectHeatmapWidget,
  HeatmapWidget,
  HourlyRatesWidget,
  LivePresenceWidget,
  MemberLeaderboardWidget,
  PendingTimesheetsWidget,
  ProjectHealthWidget,
  RateEfficiencyWidget,
  RevenueTrendWidget,
  TaskBreakdownWidget,
  TeamUtilizationWidget
} from "./widgets-lazy";
import { DashboardSkeleton, EmptyState } from "@/components/admin-page";
import {
  DailyStackedBarChart,
  ReportDonutChart,
  ReportBreakdownTable,
  WeeklyActivityChart,
  RevenueByProjectChart,
  HoursByMemberChart
} from "@/components/charts-lazy";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { LivePresenceBadge } from "@/components/live-presence-badge";
import { formatDurationClock } from "@/components/report-charts";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

// Types
type ChartByMode = "billability" | "project";
type GroupByMode = "user" | "project";

const ResponsiveGridLayout = WidthProvider(Responsive);

const ADMIN_PERIOD_PRESETS = [
  { value: "week" as const, label: "This week" },
  { value: "month" as const, label: "This month" }
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
  const session = useSessionStore((s) => s.session);
  const ws = getEffectiveWorkspaceId() ?? session?.workspaceId ?? "";
  const [range, setRange] = useState<DashboardPeriodSelection>("week");
  const [startDate, setStartDate] = useState<string>(() => applyDashboardPeriodPreset("week").from);
  const [endDate, setEndDate] = useState<string>(() => applyDashboardPeriodPreset("week").to);
  const [projectId, setProjectId] = useState("");
  const [userId, setUserId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberDto[]>([]);
  const [report, setReport] = useState<DashboardReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function handleRangePresetChange(newRange: DashboardPeriodPreset) {
    setRange(newRange);
    const { from, to } = applyDashboardPeriodPreset(newRange);
    setStartDate(from);
    setEndDate(to);
  }

  function handleDateRangeChange(from: string, to: string) {
    setStartDate(from);
    setEndDate(to);
    setRange(matchDashboardPeriodPreset(from, to, ["week", "month"]) ?? "custom");
  }

  // Widget Customization UI States
  const [mounted, setMounted] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isArranging, setIsArranging] = useState(false);
  const [gridBreakpoint, setGridBreakpoint] = useState<DashboardBreakpoint>("lg");
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
  const persistLayout = useWidgetLayout((s) => s.persistLayout);
  const saveLayoutAsDefault = useWidgetLayout((s) => s.saveLayoutAsDefault);
  const restoreLayout = useWidgetLayout((s) => s.restoreLayout);
  const toggleWidget = useWidgetLayout((s) => s.toggleWidget);
  const resetLayout = useWidgetLayout((s) => s.resetLayout);

  const arrangeSnapshotRef = useRef<WidgetLayoutItem[] | null>(null);

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
    fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
    fetchListItems<CategoryDto>(ROUTES.CATEGORIES.LIST, { workspaceId: ws }).then(setCategories);
  }, [ws]);

  useEffect(() => {
    if (!ws || !projectId) {
      setTeamMembers([]);
      setTasks([]);
      setUserId("");
      setTaskId("");
      return;
    }
    fetchProjectTeam(projectId, { workspaceId: ws })
      .then((team) => setTeamMembers(team.members))
      .catch(() => setTeamMembers([]));

    const filters: Record<string, string> = { projectId };
    if (categoryId) filters.categoryId = categoryId;
    fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId: ws, filters })
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
      void initialize(ws);
    }
  }, [ws, initialize]);

  const handleCancelArranging = useCallback(() => {
    if (arrangeSnapshotRef.current && ws) {
      restoreLayout(ws, arrangeSnapshotRef.current);
    }
    arrangeSnapshotRef.current = null;
    setIsArranging(false);
  }, [ws, restoreLayout]);

  // Handle Keyboard Escape shortcut to close grid customizer
  useEffect(() => {
    if (!isCatalogOpen && !isArranging) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isArranging) {
          handleCancelArranging();
        } else {
          setIsCatalogOpen(false);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCatalogOpen, isArranging, handleCancelArranging]);

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

  const handleResetLayout = () => {
    void resetLayout(ws)
      .then(() => toast.success("Dashboard layout reset to default"))
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Could not reset dashboard layout")
      );
  };

  const handleDoneArranging = async () => {
    try {
      await persistLayout(ws);
      arrangeSnapshotRef.current = null;
      setIsArranging(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save dashboard layout");
    }
  };

  const handleDoneAndSaveAsDefault = async () => {
    try {
      await persistLayout(ws);
      await saveLayoutAsDefault(ws);
      arrangeSnapshotRef.current = null;
      setIsArranging(false);
      toast.success("Layout saved as default");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save dashboard layout");
    }
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

  const activeLayout = layoutsByWorkspace[ws] || [];
  const visibleItems = activeLayout.filter((item) => item.visible);

  const widgetMinSizes = useMemo(() => buildWidgetMinSizeMap(WIDGET_REGISTRY), []);

  const responsiveLayouts = useMemo(
    () => generateResponsiveLayouts(visibleItems, DASHBOARD_GRID_COLS, widgetMinSizes),
    [visibleItems, widgetMinSizes]
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <AppBar title="Dashboard" description="Loading workspace analytics…" />
        <DashboardSkeleton />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-8">
        <AppBar title="Dashboard" description="Workspace time and revenue overview." />
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
          <DashboardStatCard
            label="Total Hours"
            value={formatDurationClock(report!.workspace.totalHours)}
            hint={`${report!.workspace.activeMembers} members active`}
            icon={Clock}
            tone="primary"
          />
        );
      case "stat_billable":
        return (
          <DashboardStatCard
            label="Billable Hours"
            value={formatDurationClock(report!.workspace.billableHours)}
            hint={`${report!.workspace.billablePercent}% of total`}
            icon={DollarSign}
            tone="success"
          />
        );
      case "stat_nonbillable":
        return (
          <DashboardStatCard
            label="Non-Billable"
            value={formatDurationClock(report!.workspace.nonBillableHours)}
            icon={Clock}
            tone="warning"
          />
        );
      case "stat_revenue":
        return (
          <DashboardStatCard
            label="Revenue"
            value={`$${formatMoney(report!.workspace.totalAmount)}`}
            hint={report!.workspace.currency}
            icon={DollarSign}
            tone="premium"
          />
        );
      case "stat_projects":
        return (
          <DashboardStatCard
            label="Active Projects"
            value={String(report!.workspace.activeProjects)}
            hint="With time logged"
            icon={Folder}
            tone="premium"
          />
        );
      case "stat_members":
        return (
          <DashboardStatCard
            label="Active Members"
            value={String(report!.workspace.activeMembers)}
            hint="With time logged"
            icon={Users}
            tone="warning"
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
        return <WeeklyActivityChart report={report!} />;
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

  return (
    <div className="space-y-8 min-h-screen pb-16">
      <AppBar
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
            <AppBarActionButton
              active={isCatalogOpen}
              aria-label={isCatalogOpen ? "Closing catalog" : "Add widgets"}
              onClick={() => {
                setIsCatalogOpen(!isCatalogOpen);
                if (isArranging) {
                  handleCancelArranging();
                }
              }}
            >
              <LayoutGrid className="size-3.5 shrink-0" aria-hidden />
              <span className="hidden @min-[1080px]/shell:inline">
                {isCatalogOpen ? "Closing Catalog" : "Add Widgets"}
              </span>
            </AppBarActionButton>
            <AppBarActionButton
              active={isArranging}
              aria-label={isArranging ? "Done arranging" : "Arrange grid"}
              onClick={async () => {
                if (isArranging) {
                  try {
                    await persistLayout(ws);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not save dashboard layout");
                    return;
                  }
                  arrangeSnapshotRef.current = null;
                } else {
                  const current = layoutsByWorkspace[ws];
                  if (current) {
                    arrangeSnapshotRef.current = current.map((item) => ({ ...item }));
                  }
                }
                setIsArranging(!isArranging);
                setIsCatalogOpen(false);
              }}
            >
              <Move className="size-3.5 shrink-0" aria-hidden />
              <span className="hidden @min-[1080px]/shell:inline">
                {isArranging ? "Done Arranging" : "Arrange Grid"}
              </span>
            </AppBarActionButton>
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
        <DashboardArrangeBanner
          editModeLabel="Full-Width Edit Mode"
          onCancel={handleCancelArranging}
          onResetLayout={handleResetLayout}
          onDone={handleDoneArranging}
          onSaveAsDefault={handleDoneAndSaveAsDefault}
        />
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 py-4">
          <DashboardPeriodFilter
            range={range}
            onPresetChange={handleRangePresetChange}
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChange}
            presets={ADMIN_PERIOD_PRESETS}
            dateRangeAriaLabel="Dashboard date range"
          />

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
              className={`layout ${isArranging ? "layout-customizing" : ""}`}
              layouts={responsiveLayouts}
              breakpoints={DASHBOARD_GRID_BREAKPOINTS}
              cols={DASHBOARD_GRID_COLS}
              rowHeight={80}
              compactType="vertical"
              isDraggable={isArranging}
              isResizable={isArranging}
              draggableCancel="button, a, input, select, textarea, [role='menu'], [role='menuitem'], .widget-no-drag"
              resizeHandles={["s", "e", "se"]}
              onBreakpointChange={(breakpoint) =>
                setGridBreakpoint(breakpoint as DashboardBreakpoint)
              }
              onLayoutChange={(currentLayout) => {
                if (isArranging && isPersistableDashboardBreakpoint(gridBreakpoint)) {
                  updateLayout(ws, currentLayout, { persist: false });
                }
              }}
              margin={[16, 16]}
              containerPadding={[0, 0]}
            >
              {visibleItems.map((item) => {
                const widgetDef = WIDGET_REGISTRY.find((w) => w.id === item.i);
                const label = widgetDef?.label ?? "Widget";
                return (
                  <div key={item.i} className="min-w-0 h-full w-full">
                    <WidgetShell
                      id={item.i}
                      label={label}
                      isEditing={isArranging}
                      showTitleInView={widgetDef?.group !== "kpi"}
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
