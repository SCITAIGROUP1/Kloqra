"use client";

import { ROUTES } from "@chronomint/contracts";
import type {
  TimeLogDto,
  ProjectDto,
  TaskDto,
  TimesheetPeriodDto,
  ActiveTimerDto
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
  ProjectColorDot,
  Input,
  SegmentedControl
} from "@chronomint/ui";
import { toDateInputValue } from "@chronomint/web-shared";
import { Play, Pause, Square, LayoutGrid, Move } from "lucide-react";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import { toast } from "sonner";
import { useWidgetLayout } from "./use-widget-layout";
import { WidgetControlPanel } from "./widget-control-panel";
import { WIDGET_REGISTRY } from "./widget-registry";
import { WidgetShell } from "./widget-shell";
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

const RANGE_OPTIONS: { value: RangeDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" }
];

type RangeDays = 7 | 30 | 90;

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
  const { active, elapsedSec, isPaused, setActive, tick } = useTimerStore();
  const { tasks, projects, setTasks, setProjects } = useProjectsStore();

  // Dashboard filter states
  const [range, setRange] = useState<RangeDays | "">(7);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toDateInputValue(d);
  });
  const [endDate, setEndDate] = useState<string>(() => toDateInputValue(new Date()));
  const [filterProjectId, setFilterProjectId] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);

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
      const res = await api<{ items: TimeLogDto[] }>(`${ROUTES.TIMELOGS.LIST}?${params}`, {
        workspaceId: ws
      });
      setLogs(res.items || []);
    } catch {
      // ignore
    }
  }, [ws, startDate, endDate]);

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
        api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects),
        api<TaskDto[]>(ROUTES.TASKS.LIST, { workspaceId: ws }).then(setTasks),
        fetchLogs(),
        fetchSubmissions(),
        fetchActiveTimer()
      ]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [ws, setProjects, setTasks, fetchLogs, fetchSubmissions, fetchActiveTimer]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Trigger fetchLogs when date range changes (after initial mount)
  useEffect(() => {
    if (!loading) {
      setLogsLoading(true);
      fetchLogs().finally(() => setLogsLoading(false));
    }
  }, [startDate, endDate, fetchLogs, loading]);

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

  const handleQuickSelect = (pId: string, tId: string) => {
    setProjectId(pId);
    setTaskChoice(tId);
  };

  // Filter logs by selected project
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterProjectId) {
        const task = tasks.find((t) => t.id === log.taskId);
        if (!task || task.projectId !== filterProjectId) {
          return false;
        }
      }
      return true;
    });
  }, [logs, filterProjectId, tasks]);

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
      const activeProjectMatches = !filterProjectId || activeTask.projectId === filterProjectId;
      if (activeProjectMatches) {
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
  }, [filteredLogs, projects, tracking, activeTask, filterProjectId, elapsedSec, isBillable]);

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
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="h-24 bg-card animate-pulse" />
          <Card className="h-24 bg-card animate-pulse" />
          <Card className="h-24 bg-card animate-pulse" />
        </div>
        <Card className="h-96 bg-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Analyze your weekly progress and customize your widget layout.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant={isCatalogOpen ? "secondary" : "outline"}
            onClick={() => {
              setIsCatalogOpen(!isCatalogOpen);
              setIsArranging(false);
            }}
            className="gap-1.5 text-xs h-9"
          >
            <LayoutGrid className="size-3.5" />
            {isCatalogOpen ? "Close Catalog" : "Add Widgets"}
          </Button>
          <Button
            size="sm"
            variant={isArranging ? "secondary" : "outline"}
            onClick={() => {
              setIsArranging(!isArranging);
              setIsCatalogOpen(false);
            }}
            className="gap-1.5 text-xs h-9"
          >
            <Move className="size-3.5" />
            {isArranging ? "Done Arranging" : "Arrange Widgets"}
          </Button>
        </div>
      </div>

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
        <div className="sticky top-0 z-40 w-full border border-border bg-card/85 backdrop-blur-md rounded-lg shadow-sm px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex items-center gap-2">
            <Move className="size-4 text-primary animate-pulse shrink-0" />
            <span className="text-xs font-semibold">Rearranging Layout</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline ml-2">
              Drag headers to move, drag bottom-right corner handles to resize.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleResetLayout} className="h-7 text-xs">
              Reset
            </Button>
            <Button size="sm" onClick={() => setIsArranging(false)} className="h-7 text-xs">
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Period</Label>
              <div className="flex flex-wrap items-center gap-3">
                <SegmentedControl
                  value={range as RangeDays}
                  onChange={(v) => handleRangePresetChange(v as RangeDays)}
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
            <div className="space-y-2 min-w-[200px]">
              <Label className="text-xs font-medium text-muted-foreground">Project</Label>
              <Select
                value={filterProjectId || "__all__"}
                onValueChange={(v) => setFilterProjectId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <ProjectColorDot color={p.color} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
            draggableHandle=".drag-handle"
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
              let label = widgetDef?.label ?? "Widget";
              if (item.i === "stat_total_hours" && range !== 7) {
                label = "Total Hours (Period)";
              }
              if (item.i === "weekly_progress" && range !== 7) {
                label = "Progress Chart";
              }

              return (
                <div key={item.i} className="w-full h-full">
                  <WidgetShell
                    id={item.i}
                    label={label}
                    isEditing={isArranging}
                    onHide={() => toggleWidget(ws, item.i)}
                  >
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
