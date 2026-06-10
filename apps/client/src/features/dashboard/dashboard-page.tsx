"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  TimeLogDto,
  ProjectDto,
  TaskDto,
  TimesheetPeriodDto,
  ActiveTimerDto,
  CategoryDto,
  WorkspaceMemberDto
} from "@kloqra/contracts";
import {
  AppBar,
  AppBarActionButton,
  Button,
  Card,
  CardContent,
  DashboardSkeleton,
  Input,
  Label,
  ProjectColorDot,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import {
  applyDashboardPeriodPreset,
  DashboardArrangeBanner,
  matchDashboardPeriodPreset,
  ReportScopeFilters,
  type DashboardPeriodPreset,
  fetchListItems
} from "@kloqra/web-shared";
import { Play, Pause, Square, LayoutGrid, Move } from "lucide-react";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import { toast } from "sonner";
import { useWidgetLayout } from "./use-widget-layout";
import { WidgetControlPanel } from "./widget-control-panel";
import { WIDGET_REGISTRY } from "./widget-registry";
import { WidgetShell } from "./widget-shell";
import { CategorySplitWidget } from "./widgets/category-split-widget";
import { ProjectSplitWidget } from "./widgets/project-split-widget";
import { TimesheetSubmissionsWidget } from "./widgets/timesheet-submissions-widget";
import { TodayLogsWidget } from "./widgets/today-logs-widget";
import { WeeklyProgressWidget } from "./widgets/weekly-progress-widget";
import { DailyGoalWidget } from "@/features/timer/daily-goal-widget";
import { QuickActions } from "@/features/timer/quick-actions";
import { toDateKey } from "@/features/timesheet/calendar-utils";
import { suggestBillableFromTask } from "@/features/timesheet/time-entry-dialog";
import { api } from "@/lib/api";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { isActiveTimer, useTimerStore } from "@/stores/timer.store";

const ResponsiveGridLayout = WidthProvider(Responsive);

const RANGE_OPTIONS: { value: DashboardPeriodPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" }
];

function formatElapsed(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "00:00:00";
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const o = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, o, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function DashboardPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const session = useSessionStore((s) => s.session);
  const isAdmin = session?.workspaceRole === "ADMIN";
  const { active, elapsedSec, isPaused, setActive, tick } = useTimerStore();
  const { tasks, projects, setTasks, setProjects } = useProjectsStore();

  // Dashboard filter states
  const [range, setRange] = useState<DashboardPeriodPreset | "">("week");
  const [startDate, setStartDate] = useState<string>(() => applyDashboardPeriodPreset("week").from);
  const [endDate, setEndDate] = useState<string>(() => applyDashboardPeriodPreset("week").to);
  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterTaskId, setFilterTaskId] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [scopeTasks, setScopeTasks] = useState<TaskDto[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberDto[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  function handleRangePresetChange(newRange: DashboardPeriodPreset) {
    setRange(newRange);
    const { from, to } = applyDashboardPeriodPreset(newRange);
    setStartDate(from);
    setEndDate(to);
  }

  function handleCustomDateChange(newStart: string, newEnd: string) {
    setStartDate(newStart);
    setEndDate(newEnd);
    setRange(matchDashboardPeriodPreset(newStart, newEnd) ?? "");
  }

  const [logs, setLogs] = useState<TimeLogDto[]>([]);
  const [submissions, setSubmissions] = useState<TimesheetPeriodDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout customizing states
  const [mounted, setMounted] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isArranging, setIsArranging] = useState(false);

  // Local active timer controls
  const [projectId, setProjectId] = useState("");
  const [taskChoice, setTaskChoice] = useState("");
  const [stopDescription, setStopDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);

  // Layout store selectors
  const layoutsByWorkspace = useWidgetLayout((s) => s.layoutsByWorkspace);
  const initialized = useWidgetLayout((s) => s.initialized);
  const initialize = useWidgetLayout((s) => s.initialize);
  const updateLayout = useWidgetLayout((s) => s.updateLayout);
  const persistLayout = useWidgetLayout((s) => s.persistLayout);
  const saveLayoutAsDefault = useWidgetLayout((s) => s.saveLayoutAsDefault);
  const toggleWidget = useWidgetLayout((s) => s.toggleWidget);
  const resetLayout = useWidgetLayout((s) => s.resetLayout);

  const activeTask = active ? tasks.find((t) => t.id === active.taskId) : null;
  const activeProject = activeTask ? projects.find((p) => p.id === activeTask.projectId) : null;
  const tracking = isActiveTimer(active);

  const canStart = Boolean(projectId) && Boolean(taskChoice);

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === projectId),
    [tasks, projectId]
  );

  const projectTasksByCategory = useMemo(() => {
    const groups = new Map<string, TaskDto[]>();
    for (const t of projectTasks) {
      const key = t.categoryName ?? "Other";
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [projectTasks]);

  // Prevent SSR layout hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize layout store
  useEffect(() => {
    if (ws) {
      initialize(ws);
    }
  }, [ws, initialize]);

  // Handle keydown escape to close Customize panels
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

  const fetchLogs = useCallback(async () => {
    if (!ws) return;
    try {
      const from = new Date(startDate + "T00:00:00");
      const to = new Date(endDate + "T23:59:59.999");
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString()
      });
      if (isAdmin && filterUserId) params.set("userId", filterUserId);
      if (filterTaskId) params.set("taskId", filterTaskId);
      const res = await api<{ items: TimeLogDto[] }>(`${ROUTES.TIMELOGS.LIST}?${params}`, {
        workspaceId: ws
      });
      setLogs(res.items || []);
    } catch {
      // ignore
    }
  }, [ws, startDate, endDate, isAdmin, filterUserId, filterTaskId]);

  const fetchActiveTimer = useCallback(async () => {
    if (!ws) return;
    try {
      const res = await api<ActiveTimerDto | null>(ROUTES.TIMER.ACTIVE, {
        workspaceId: ws
      });
      setActive(res);
    } catch {
      // ignore
    }
  }, [ws, setActive]);

  const fetchSubmissions = useCallback(async () => {
    if (!ws) return;
    try {
      const res = await api<{ items: TimesheetPeriodDto[] }>(ROUTES.TIMESHEETS.MY_SUBMISSIONS, {
        workspaceId: ws
      });
      setSubmissions(res.items || []);
    } catch {
      // ignore
    }
  }, [ws]);

  const loadAll = useCallback(async () => {
    if (!ws) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects),
        fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId: ws }).then(setTasks),
        fetchListItems<CategoryDto>(ROUTES.CATEGORIES.LIST, { workspaceId: ws }).then(
          setCategories
        ),
        isAdmin
          ? api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(ws), { workspaceId: ws }).then(
              setWorkspaceMembers
            )
          : Promise.resolve(),
        fetchLogs(),
        fetchSubmissions(),
        fetchActiveTimer()
      ]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [ws, isAdmin, setProjects, setTasks, fetchLogs, fetchSubmissions, fetchActiveTimer]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!ws || !filterProjectId) {
      setScopeTasks([]);
      return;
    }
    const filters: Record<string, string> = { projectId: filterProjectId };
    if (filterCategoryId) filters.categoryId = filterCategoryId;
    fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId: ws, filters })
      .then(setScopeTasks)
      .catch(() => setScopeTasks([]));
  }, [ws, filterProjectId, filterCategoryId]);

  useEffect(() => {
    if (!filterUserId) return;
    if (!workspaceMembers.some((m) => m.userId === filterUserId)) {
      setFilterUserId("");
    }
  }, [workspaceMembers, filterUserId]);

  useEffect(() => {
    if (!filterTaskId) return;
    if (!scopeTasks.some((t) => t.id === filterTaskId)) {
      setFilterTaskId("");
    }
  }, [scopeTasks, filterTaskId]);

  function onFilterProjectChange(nextId: string) {
    setFilterProjectId(nextId);
    setFilterUserId("");
    setFilterTaskId("");
  }

  function onFilterCategoryChange(nextId: string) {
    setFilterCategoryId(nextId);
    setFilterTaskId("");
  }

  function clearScopeFilters() {
    setFilterProjectId("");
    setFilterCategoryId("");
    setFilterTaskId("");
    setFilterUserId("");
  }

  const scopeMembers = useMemo(
    () => workspaceMembers.map((m) => ({ userId: m.userId, userName: m.userName })),
    [workspaceMembers]
  );

  // Trigger fetchLogs when date range or scope filters change (after initial mount)
  useEffect(() => {
    if (!loading) {
      setLogsLoading(true);
      fetchLogs().finally(() => setLogsLoading(false));
    }
  }, [startDate, endDate, filterUserId, filterTaskId, fetchLogs, loading]);

  // Keep timer ticking
  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  // Auto-fill billable default when project/task changes
  useEffect(() => {
    if (activeTask) {
      setIsBillable(activeTask.billableDefault);
    }
  }, [activeTask]);

  async function startTimer() {
    if (!canStart) return;
    setStarting(true);
    try {
      const res = await api<ActiveTimerDto>(ROUTES.TIMER.START, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ taskId: taskChoice })
      });
      setActive(res);
      setTaskChoice("");
      toast.success("Timer started!");
      void fetchLogs();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start timer";
      toast.error(message);
    } finally {
      setStarting(false);
    }
  }

  async function stopTimer() {
    setStopping(true);
    try {
      await api(ROUTES.TIMER.STOP, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          description: stopDescription.trim() || undefined,
          isBillable
        })
      });
      setActive(null);
      setStopDescription("");
      toast.success("Timer stopped! Time entry saved.");
      void fetchLogs();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not stop timer";
      toast.error(message);
    } finally {
      setStopping(false);
    }
  }

  async function pauseTimer() {
    setPausing(true);
    try {
      await api(ROUTES.TIMER.PAUSE, { method: "POST", workspaceId: ws });
      await fetchActiveTimer();
      toast.success("Timer paused");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not pause");
    } finally {
      setPausing(false);
    }
  }

  async function resumeTimer() {
    setResuming(true);
    try {
      await api(ROUTES.TIMER.RESUME, { method: "POST", workspaceId: ws });
      await fetchActiveTimer();
      toast.success("Timer resumed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resume");
    } finally {
      setResuming(false);
    }
  }

  const handleDeleteLog = async (logId: string) => {
    try {
      await api(`/timelogs/${logId}`, { method: "DELETE", workspaceId: ws });
      toast.success("Time entry deleted!");
      void fetchLogs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete time log");
    }
  };

  const handleResumeTask = async (taskId: string) => {
    try {
      const res = await api<ActiveTimerDto>(ROUTES.TIMER.START, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ taskId })
      });
      setActive(res);
      toast.success("Timer started!");
      void fetchLogs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not restart timer");
    }
  };

  const handleResetLayout = () => {
    resetLayout(ws);
    toast.success("Dashboard layout reset");
  };

  const handleDoneArranging = () => {
    persistLayout(ws);
    setIsArranging(false);
  };

  const handleDoneAndSaveAsDefault = () => {
    persistLayout(ws);
    saveLayoutAsDefault(ws);
    setIsArranging(false);
    toast.success("Layout saved as default");
  };

  const handleQuickSelect = (pId: string, tId: string) => {
    setProjectId(pId);
    setTaskChoice(tId);
  };

  // Filter logs by scope (project/category/task/member)
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const task = tasks.find((t) => t.id === log.taskId);
      if (filterProjectId && (!task || task.projectId !== filterProjectId)) {
        return false;
      }
      if (filterCategoryId && (!task || task.categoryId !== filterCategoryId)) {
        return false;
      }
      if (filterTaskId && log.taskId !== filterTaskId) {
        return false;
      }
      if (isAdmin && filterUserId && log.userId !== filterUserId) {
        return false;
      }
      return true;
    });
  }, [logs, filterProjectId, filterCategoryId, filterTaskId, filterUserId, isAdmin, tasks]);

  // Filter submissions by range and project
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Filter by project
      if (filterProjectId && sub.projectId !== filterProjectId) {
        return false;
      }
      // Filter by period
      const subStart = new Date(sub.periodStart);
      const fromDate = new Date(startDate + "T00:00:00");
      const toDate = new Date(endDate + "T23:59:59.999");
      if (subStart < fromDate || subStart > toDate) {
        return false;
      }
      return true;
    });
  }, [submissions, filterProjectId, startDate, endDate]);

  // Aggregates for Stats Cards
  const periodStats = useMemo(() => {
    let totalSec = 0;
    let billableSec = 0;

    for (const log of filteredLogs) {
      totalSec += log.durationSec;
      if (log.isBillable) {
        billableSec += log.durationSec;
      }
    }

    if (tracking && activeTask) {
      const currentUserId = session?.user.id;
      const userMatches = !filterUserId || filterUserId === currentUserId;
      const projectMatches = !filterProjectId || activeTask.projectId === filterProjectId;
      const categoryMatches = !filterCategoryId || activeTask.categoryId === filterCategoryId;
      const taskMatches = !filterTaskId || activeTask.id === filterTaskId;
      if (userMatches && projectMatches && categoryMatches && taskMatches) {
        totalSec += elapsedSec;
        if (isBillable) {
          billableSec += elapsedSec;
        }
      }
    }

    return {
      totalHours: Math.round((totalSec / 3600) * 10) / 10,
      billableHours: Math.round((billableSec / 3600) * 10) / 10,
      assignedProjects: projects.filter((p) => p.isActive).length
    };
  }, [
    filteredLogs,
    projects,
    tracking,
    activeTask,
    filterProjectId,
    filterCategoryId,
    filterTaskId,
    filterUserId,
    session?.user.id,
    elapsedSec,
    isBillable
  ]);

  const todayLoggedSec = useMemo(() => {
    const todayStr = toDateKey(new Date());
    const todayLogs = filteredLogs.filter((log) => toDateKey(new Date(log.startTime)) === todayStr);
    return todayLogs.reduce((sum, log) => sum + log.durationSec, 0);
  }, [filteredLogs]);

  const totalTodaySec = todayLoggedSec + (tracking ? elapsedSec : 0);

  // Layout configurations
  const activeLayout = layoutsByWorkspace[ws] || [];
  const visibleItems = activeLayout.filter((item) => item.visible);

  if (loading) {
    return (
      <div className="space-y-8">
        <AppBar
          title="Dashboard"
          description="Analyze your weekly progress and customize your widget layout."
        />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 pb-16">
      <AppBar
        title="Dashboard"
        description="Analyze your weekly progress and customize your widget layout."
        actions={
          <>
            <AppBarActionButton
              active={isCatalogOpen}
              onClick={() => {
                setIsCatalogOpen(!isCatalogOpen);
                setIsArranging(false);
              }}
            >
              <LayoutGrid className="size-3.5" />
              {isCatalogOpen ? "Close Catalog" : "Add Widgets"}
            </AppBarActionButton>
            <AppBarActionButton
              active={isArranging}
              onClick={() => {
                if (isArranging) {
                  persistLayout(ws);
                }
                setIsArranging(!isArranging);
                setIsCatalogOpen(false);
              }}
            >
              <Move className="size-3.5" />
              {isArranging ? "Done Arranging" : "Arrange Grid"}
            </AppBarActionButton>
          </>
        }
      />

      {/* Customize Panels */}
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
          onResetLayout={handleResetLayout}
          onDone={handleDoneArranging}
          onSaveAsDefault={handleDoneAndSaveAsDefault}
        />
      )}

      {/* Filters Toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Period</Label>
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                value={range as DashboardPeriodPreset}
                onChange={(v) => handleRangePresetChange(v as DashboardPeriodPreset)}
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
            className="w-full"
            taskRequiresProject
            hideMemberFilter={!isAdmin}
            values={{
              projectId: filterProjectId,
              categoryId: filterCategoryId,
              taskId: filterTaskId,
              userId: filterUserId
            }}
            projects={projects}
            categories={categories}
            tasks={scopeTasks}
            members={scopeMembers}
            onProjectChange={onFilterProjectChange}
            onCategoryChange={onFilterCategoryChange}
            onTaskChange={setFilterTaskId}
            onUserChange={setFilterUserId}
            onClearAll={clearScopeFilters}
            hintText="Optional — narrow dashboard widgets"
          />
        </CardContent>
      </Card>

      {/* Grid container */}
      <div
        className={`relative transition-opacity duration-200 ${logsLoading ? "opacity-60 pointer-events-none" : ""}`}
      >
        {mounted && initialized && (
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
                updateLayout(ws, currentLayout, { persist: false });
              }
            }}
            margin={[16, 16]}
            containerPadding={[16, 0]}
          >
            {visibleItems.map((item) => {
              const widgetDef = WIDGET_REGISTRY.find((w) => w.id === item.i);
              let label = widgetDef?.label ?? "Widget";
              if (item.i === "stat_total_hours") {
                if (range === "today") label = "Total Hours (Today)";
                else if (range === "month") label = "Total Hours (Period)";
              }
              if (item.i === "weekly_progress") {
                if (range === "today") label = "Today's Progress";
                else if (range === "month") label = "Progress Chart";
              }

              return (
                <div key={item.i} className="w-full h-full">
                  <WidgetShell id={item.i} label={label} isEditing={isArranging}>
                    {(() => {
                      switch (item.i) {
                        case "stat_total_hours":
                          return (
                            <div className="flex flex-col justify-center h-full">
                              <span className="text-2xl font-bold tracking-tight text-foreground">
                                {periodStats.totalHours}h
                              </span>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5">
                                {periodStats.billableHours}h billable
                              </span>
                            </div>
                          );
                        case "stat_billable":
                          return (
                            <div className="flex flex-col justify-center h-full">
                              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                {periodStats.billableHours}h
                              </span>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5">
                                {periodStats.totalHours > 0
                                  ? Math.round(
                                      (periodStats.billableHours / periodStats.totalHours) * 100
                                    )
                                  : 0}
                                % of period total
                              </span>
                            </div>
                          );
                        case "stat_projects":
                          return (
                            <div className="flex flex-col justify-center h-full">
                              <span className="text-2xl font-bold tracking-tight text-foreground">
                                {periodStats.assignedProjects}
                              </span>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5">
                                Assigned projects
                              </span>
                            </div>
                          );
                        case "weekly_progress":
                          return (
                            <WeeklyProgressWidget
                              logs={filteredLogs}
                              startDate={startDate}
                              endDate={endDate}
                            />
                          );
                        case "project_split":
                          return (
                            <ProjectSplitWidget
                              logs={filteredLogs}
                              projects={projects}
                              tasks={tasks}
                            />
                          );
                        case "category_split":
                          return <CategorySplitWidget />;
                        case "pinned_favorites":
                          return (
                            <QuickActions
                              onSelect={handleQuickSelect}
                              currentProjectId={projectId}
                              currentTaskId={taskChoice}
                              filterProjectId={filterProjectId}
                              mode="favorites"
                            />
                          );
                        case "recent_activity":
                          return (
                            <QuickActions
                              onSelect={handleQuickSelect}
                              currentProjectId={projectId}
                              currentTaskId={taskChoice}
                              filterProjectId={filterProjectId}
                              mode="recents"
                            />
                          );
                        case "today_logs":
                          return (
                            <TodayLogsWidget
                              logs={filteredLogs}
                              projects={projects}
                              tasks={tasks}
                              onDeleteLog={handleDeleteLog}
                              onResumeTask={handleResumeTask}
                            />
                          );
                        case "timesheet_submissions":
                          return (
                            <TimesheetSubmissionsWidget
                              submissions={filteredSubmissions}
                              projects={projects}
                            />
                          );
                        case "daily_progress":
                          return (
                            <div className="flex h-full items-center justify-center py-2">
                              <DailyGoalWidget totalSeconds={totalTodaySec} cardless />
                            </div>
                          );
                        case "quick_timer":
                          return (
                            <div className="flex flex-col justify-between h-full min-h-[140px] text-xs gap-3">
                              {tracking ? (
                                <div className="space-y-3 flex-1 flex flex-col justify-between">
                                  {/* Left/Right clock layout */}
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                                        Active Tracking
                                      </span>
                                      {activeProject && activeTask && (
                                        <div className="flex items-center gap-1.5 mt-1 font-semibold truncate">
                                          <ProjectColorDot color={activeProject.color} size="sm" />
                                          <span className="truncate">{activeProject.name}</span>
                                          <span className="text-muted-foreground font-normal">
                                            &bull;
                                          </span>
                                          <span className="text-muted-foreground truncate font-normal">
                                            {activeTask.taskName}
                                          </span>
                                        </div>
                                      )}
                                      <div className="mt-2">
                                        <Input
                                          value={stopDescription}
                                          onChange={(e) => setStopDescription(e.target.value)}
                                          placeholder="Note (optional)"
                                          className="h-7 text-xs bg-background/50"
                                        />
                                      </div>
                                    </div>
                                    <div className="font-mono text-xl font-bold tabular-nums shrink-0 bg-muted/40 px-3 py-2 rounded-lg border border-border/40">
                                      {formatElapsed(elapsedSec)}
                                    </div>
                                  </div>

                                  {/* Action Buttons Row */}
                                  <div className="flex gap-2">
                                    {isPaused ? (
                                      <Button
                                        onClick={resumeTimer}
                                        disabled={resuming}
                                        className="h-8 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                      >
                                        <Play className="size-3 mr-1 fill-current" />
                                        Resume
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        onClick={pauseTimer}
                                        disabled={pausing}
                                        className="h-8 text-xs flex-1 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                                      >
                                        <Pause className="size-3 mr-1" />
                                        Pause
                                      </Button>
                                    )}
                                    <Button
                                      variant="destructive"
                                      onClick={stopTimer}
                                      disabled={stopping}
                                      className="h-8 text-xs flex-1"
                                    >
                                      <Square className="size-3 mr-1 fill-current" />
                                      Stop
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3 flex-1 flex flex-col justify-between">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground">
                                        Project
                                      </Label>
                                      <Select value={projectId} onValueChange={setProjectId}>
                                        <SelectTrigger className="h-8 bg-background text-xs">
                                          <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                              <span className="flex items-center gap-1.5 text-xs">
                                                <ProjectColorDot color={p.color} size="sm" />
                                                {p.name}
                                              </span>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground">
                                        Task
                                      </Label>
                                      <Select
                                        value={taskChoice}
                                        onValueChange={(v) => {
                                          setTaskChoice(v);
                                          setIsBillable(suggestBillableFromTask(tasks, v));
                                        }}
                                        disabled={!projectId || projectTasks.length === 0}
                                      >
                                        <SelectTrigger className="h-8 bg-background text-xs">
                                          <SelectValue
                                            placeholder={
                                              projectTasks.length === 0 ? "No tasks" : "Select"
                                            }
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {projectTasksByCategory.map(([categoryName, list]) => (
                                            <div key={categoryName}>
                                              <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                                                {categoryName}
                                              </div>
                                              {list.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                  <span className="text-xs">{t.taskName}</span>
                                                </SelectItem>
                                              ))}
                                            </div>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <Button
                                    onClick={startTimer}
                                    disabled={!canStart || starting}
                                    className="h-8 w-full text-xs"
                                  >
                                    <Play className="size-3 mr-1 fill-current" />
                                    Start tracking
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        default:
                          return null;
                      }
                    })()}
                  </WidgetShell>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
}
