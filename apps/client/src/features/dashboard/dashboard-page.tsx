"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  TimeLogDto,
  ProjectDto,
  TaskDto,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
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
  matchDashboardPeriodPreset,
  ReportScopeFilters,
  type DashboardBreakpoint,
  type DashboardPeriodPreset,
  type DashboardPeriodSelection,
  fetchListItems
} from "@kloqra/web-shared";
import { Play, Pause, Square, LayoutGrid, Move } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import { toast } from "sonner";
import { useWidgetLayout, type WidgetLayoutItem } from "./use-widget-layout";
import { WidgetControlPanel } from "./widget-control-panel";
import { WIDGET_REGISTRY } from "./widget-registry";
import { WidgetShell } from "./widget-shell";
import { categorySplitPeriodLabel } from "./widgets/category-split-data";
import {
  CategorySplitWidget,
  DailyGoalWidget,
  ProjectSplitWidget,
  QuickActions,
  TimesheetSubmissionsWidget,
  TodayLogsWidget,
  TeamActivitiesWidget,
  WeeklyProgressWidget
} from "./widgets-lazy";
import { useSuppressAssistantLauncher } from "@/features/assistant/assistant-provider";
import { useTeamActivities } from "@/features/dashboard/use-team-activities";
import {
  useDashboardSubmissions,
  useMySubmissions
} from "@/features/submissions/use-my-submissions";
import {
  buildSubmissionByKey,
  isTimeEntryLocked,
  LOCKED_ENTRY_MESSAGE
} from "@/features/time-tracker/entry-approval-status";
import { toDateKey } from "@/features/timesheet/calendar-utils";
import { suggestBillableFromTask } from "@/features/timesheet/time-entry-draft";
import { useActiveTimerSession } from "@/hooks/use-active-timer-session";
import { useIsImpersonating } from "@/hooks/use-is-impersonating";
import { api } from "@/lib/api";
import { useActiveTimerSessionStore } from "@/stores/member-data.store";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore } from "@/stores/session.store";
import { isActiveTimer, useTimerStore } from "@/stores/timer.store";

const ResponsiveGridLayout = WidthProvider(Responsive);

const CLIENT_PERIOD_PRESETS = [
  { value: "today" as const, label: "Today" },
  { value: "week" as const, label: "This week" },
  { value: "month" as const, label: "This month" }
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
  const session = useSessionStore((s) => s.session);
  const ws = getEffectiveWorkspaceId() ?? session?.workspaceId ?? "";
  const isAdmin = session?.workspaceRole === "ADMIN";
  const isImpersonating = useIsImpersonating();
  const { active, elapsedSec, isPaused, setActive, tick } = useTimerStore();
  const { tasks, projects, setTasks, setProjects } = useProjectsStore();

  // Dashboard filter states
  const [range, setRange] = useState<DashboardPeriodSelection>("week");
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

  function handleDateRangeChange(from: string, to: string) {
    setStartDate(from);
    setEndDate(to);
    setRange(matchDashboardPeriodPreset(from, to) ?? "custom");
  }

  const [logs, setLogs] = useState<TimeLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const { submissions } = useDashboardSubmissions(ws, Boolean(ws));
  const { submissions: todaySubmissions } = useMySubmissions(
    ws,
    new Date(),
    "assigned",
    Boolean(ws)
  );

  const teamActivitiesFilters = useMemo(
    () => ({
      from: new Date(startDate + "T00:00:00").toISOString(),
      to: new Date(endDate + "T23:59:59.999").toISOString(),
      ...(filterProjectId ? { projectId: filterProjectId } : {}),
      ...(filterCategoryId ? { categoryId: filterCategoryId } : {}),
      ...(filterTaskId ? { taskId: filterTaskId } : {}),
      ...(isAdmin && filterUserId ? { userId: filterUserId } : {})
    }),
    [startDate, endDate, filterProjectId, filterCategoryId, filterTaskId, filterUserId, isAdmin]
  );

  const layoutsByWorkspace = useWidgetLayout((s) => s.layoutsByWorkspace);
  const initialized = useWidgetLayout((s) => s.initialized);
  const teamActivitiesWidgetVisible = (layoutsByWorkspace[ws] ?? []).some(
    (item) => item.i === "team_activities" && item.visible
  );

  const {
    data: teamActivities,
    loading: teamActivitiesLoading,
    error: teamActivitiesError
  } = useTeamActivities(
    ws,
    Boolean(ws) && initialized && teamActivitiesWidgetVisible,
    teamActivitiesFilters
  );
  useActiveTimerSession(ws, Boolean(ws));

  // Layout customizing states
  const [mounted, setMounted] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isArranging, setIsArranging] = useState(false);
  const [gridBreakpoint, setGridBreakpoint] = useState<DashboardBreakpoint>("lg");

  useSuppressAssistantLauncher(isCatalogOpen || isArranging);

  // Local active timer controls
  const [projectId, setProjectId] = useState("");
  const [taskChoice, setTaskChoice] = useState("");
  const [stopDescription, setStopDescription] = useState("");
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);

  // Layout store selectors
  const initialize = useWidgetLayout((s) => s.initialize);
  const updateLayout = useWidgetLayout((s) => s.updateLayout);
  const persistLayout = useWidgetLayout((s) => s.persistLayout);
  const saveLayoutAsDefault = useWidgetLayout((s) => s.saveLayoutAsDefault);
  const restoreLayout = useWidgetLayout((s) => s.restoreLayout);
  const toggleWidget = useWidgetLayout((s) => s.toggleWidget);
  const resetLayout = useWidgetLayout((s) => s.resetLayout);

  const arrangeSnapshotRef = useRef<WidgetLayoutItem[] | null>(null);

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

  // Handle keydown escape to close Customize panels
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
    await useActiveTimerSessionStore.getState().refreshActive(ws);
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
        fetchLogs()
      ]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [ws, isAdmin, setProjects, setTasks, fetchLogs]);

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

  // Refetch logs when date range or scope filters change (skip the initial loadAll fetch).
  const hasLoadedOnceRef = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (!hasLoadedOnceRef.current) {
      hasLoadedOnceRef.current = true;
      return;
    }
    setLogsLoading(true);
    fetchLogs().finally(() => setLogsLoading(false));
  }, [startDate, endDate, filterUserId, filterTaskId, fetchLogs, loading]);

  // Keep timer ticking
  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  // Auto-fill billable default when project/task changes
  const billableForActive =
    activeTask?.billableDefault ?? suggestBillableFromTask(tasks, taskChoice);

  async function startTimer() {
    if (isImpersonating || !canStart) return;
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
    if (isImpersonating) return;
    setStopping(true);
    try {
      await api(ROUTES.TIMER.STOP, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          description: stopDescription.trim() || undefined,
          isBillable: billableForActive
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
    if (isImpersonating) return;
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
    if (isImpersonating) return;
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

  const submissionByKey = useMemo(() => buildSubmissionByKey(todaySubmissions), [todaySubmissions]);

  const isLogLocked = useCallback(
    (log: TimeLogDto) => {
      const task = tasks.find((t) => t.id === log.taskId);
      const project = task ? projects.find((p) => p.id === task.projectId) : undefined;
      return isTimeEntryLocked(log, project, submissionByKey);
    },
    [tasks, projects, submissionByKey]
  );

  const handleDeleteLog = async (logId: string) => {
    if (isImpersonating) return;
    const log = logs.find((item) => item.id === logId);
    if (log && isLogLocked(log)) {
      toast.error(LOCKED_ENTRY_MESSAGE);
      return;
    }
    try {
      await api(`/timelogs/${logId}`, { method: "DELETE", workspaceId: ws });
      toast.success("Time entry deleted!");
      void fetchLogs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete time log");
    }
  };

  const handleResumeTask = async (taskId: string) => {
    if (isImpersonating) return;
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
    void resetLayout(ws)
      .then(() => toast.success("Dashboard layout reset"))
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Could not reset dashboard layout")
      );
  };

  const handleDoneArranging = async () => {
    if (isImpersonating) return;
    try {
      await persistLayout(ws);
      arrangeSnapshotRef.current = null;
      setIsArranging(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save dashboard layout");
    }
  };

  const handleDoneAndSaveAsDefault = async () => {
    if (isImpersonating) return;
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
        if (billableForActive) {
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
    billableForActive
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

  const widgetMinSizes = useMemo(() => buildWidgetMinSizeMap(WIDGET_REGISTRY), []);

  const responsiveLayouts = useMemo(
    () => generateResponsiveLayouts(visibleItems, DASHBOARD_GRID_COLS, widgetMinSizes),
    [visibleItems, widgetMinSizes]
  );

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
          !isImpersonating ? (
            <>
              <AppBarActionButton
                active={isCatalogOpen}
                onClick={() => {
                  setIsCatalogOpen(!isCatalogOpen);
                  if (isArranging) {
                    handleCancelArranging();
                  }
                }}
              >
                <LayoutGrid className="size-3.5" />
                {isCatalogOpen ? "Close Catalog" : "Add Widgets"}
              </AppBarActionButton>
              <AppBarActionButton
                active={isArranging}
                onClick={async () => {
                  if (isArranging) {
                    try {
                      await persistLayout(ws);
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Could not save dashboard layout"
                      );
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
                <Move className="size-3.5" />
                {isArranging ? "Done Arranging" : "Arrange Grid"}
              </AppBarActionButton>
            </>
          ) : undefined
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
          onCancel={handleCancelArranging}
          onResetLayout={handleResetLayout}
          onDone={handleDoneArranging}
          onSaveAsDefault={handleDoneAndSaveAsDefault}
        />
      )}

      {/* Filters Toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-4">
          <DashboardPeriodFilter
            range={range}
            onPresetChange={handleRangePresetChange}
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChange}
            presets={CLIENT_PERIOD_PRESETS}
            dateRangeAriaLabel="Dashboard date range"
          />

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
                <div key={item.i} className="min-w-0 h-full w-full">
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
                          return (
                            <CategorySplitWidget
                              logs={filteredLogs}
                              tasks={tasks}
                              periodLabel={categorySplitPeriodLabel(range)}
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
                              isLogLocked={isLogLocked}
                            />
                          );
                        case "team_activities":
                          return (
                            <TeamActivitiesWidget
                              data={teamActivities}
                              projects={projects}
                              loading={teamActivitiesLoading}
                              error={teamActivitiesError}
                              range={range}
                              filters={teamActivitiesFilters}
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
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
                                        disabled={resuming || isImpersonating}
                                        className="h-8 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                      >
                                        <Play className="size-3 mr-1 fill-current" />
                                        Resume
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        onClick={pauseTimer}
                                        disabled={pausing || isImpersonating}
                                        className="h-8 text-xs flex-1 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                                      >
                                        <Pause className="size-3 mr-1" />
                                        Pause
                                      </Button>
                                    )}
                                    <Button
                                      variant="destructive"
                                      onClick={stopTimer}
                                      disabled={stopping || isImpersonating}
                                      className="h-8 text-xs flex-1"
                                    >
                                      <Square className="size-3 mr-1 fill-current" />
                                      Stop
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3 flex-1 flex flex-col justify-between">
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                                        onValueChange={setTaskChoice}
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
                                    disabled={!canStart || starting || isImpersonating}
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
