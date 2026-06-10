"use client";

import { ROUTES, resolveEffectiveTimezone } from "@kloqra/contracts";
import type {
  ActiveTimerDto,
  AutoStoppedTimerDto,
  ListTimeLogOccupancyResponseDto,
  ListTimeLogsResponseDto,
  ListTimesheetSubmissionsResponseDto,
  TimeLogDto,
  TaskDto,
  ProjectDto,
  TimesheetPeriodDto,
  UserProfileDto
} from "@kloqra/contracts";
import { AppBar, Button, ConfirmDialog, Badge, CenteredLoader } from "@kloqra/ui";
import { api as sharedApi, fetchListItems } from "@kloqra/web-shared";
import { Clock, Eye, EyeOff, Lock } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { CalendarTaskInfo } from "./calendar-entry-content";
import {
  addDays,
  addMonths,
  getWeekDays,
  startOfMonth,
  startOfWeekWithPreference,
  startOfDay,
  localMidnightUtcInZone,
  todayInZone,
  buildDayOccupancySegments,
  calendarDateKey,
  findOccupancyConflict,
  formatOverlapError,
  occupancyConflictLabel,
  rangeOccupiedElsewhere,
  slotIndexFromTime,
  slotIntervalForIndex
} from "./calendar-utils";
import {
  formatDayRangeLabel,
  formatMonthYearLabel,
  formatWeekRangeLabel,
  type TimesheetDisplayFormat
} from "./display-format";
import {
  TimeEntryDialog,
  canSaveTaskDraft,
  draftFromLog,
  draftFromSlot,
  draftFromSlotRange,
  draftToIsoRange,
  type TimeEntryDraft
} from "./time-entry-dialog";
import { TimesheetCalendar } from "./timesheet-calendar";
import { TimesheetMonth } from "./timesheet-month";
import { api } from "@/lib/api";
import { colorForTask } from "@/lib/project-color-styles";
import { formatTaskLabel } from "@/lib/project-labels";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { isActiveTimer, useTimerStore } from "@/stores/timer.store";
import { useTimesheetStore } from "@/stores/timesheet.store";

type ViewMode = "day" | "week" | "month";

function buildLogsQuery(from: Date, to: Date): string {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString()
  });
  return `${ROUTES.TIMELOGS.LIST}?${params}`;
}

function buildOccupancyQuery(from: Date, to: Date): string {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString()
  });
  return `${ROUTES.TIMELOGS.OCCUPANCY}?${params}`;
}

export function TimesheetPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [displayFormat, setDisplayFormat] = useState<TimesheetDisplayFormat | null>(null);
  const [weekStartPref, setWeekStartPref] = useState<"monday" | "sunday">("monday");

  useEffect(() => {
    if (!ws) return;
    sharedApi<UserProfileDto>(ROUTES.USERS.ME, { workspaceId: ws })
      .then((profile) => {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezone = resolveEffectiveTimezone(profile.preferences, browserTz);
        setWeekStartPref(profile.preferences.weekStart ?? "monday");
        setDisplayFormat({
          timezone,
          dateFormat: profile.effectiveDateFormat,
          timeFormat: profile.effectiveTimeFormat
        });
      })
      .catch(() => {});
  }, [ws]);

  const timezone = displayFormat?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { logs, setLogs } = useTimesheetStore();
  const [occupancy, setOccupancy] = useState<ListTimeLogOccupancyResponseDto["items"]>([]);
  const { tasks, projects, workspaceNamesById, setTasks, setProjects } = useProjectsStore();

  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLogDto | null>(null);
  const [draft, setDraft] = useState<TimeEntryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteLog, setConfirmDeleteLog] = useState<TimeLogDto | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(true);

  const [showOccupancyOverlay, setShowOccupancyOverlay] = useState(true);
  const { active: activeTimer, elapsedSec: liveElapsedSec, setActive, tick } = useTimerStore();

  useEffect(() => {
    const overlaySaved = localStorage.getItem("kloqra-show-occupancy-overlay");
    if (overlaySaved === "false") {
      setShowOccupancyOverlay(false);
    }
  }, []);

  const fetchActiveTimer = useCallback(async () => {
    if (!ws) return;
    try {
      const res = await api<ActiveTimerDto | AutoStoppedTimerDto | null>(ROUTES.TIMER.ACTIVE, {
        workspaceId: ws
      });
      if (res && "autostopped" in res && res.autostopped) {
        setActive(null);
        return;
      }
      setActive(res as ActiveTimerDto | null);
    } catch {
      setActive(null);
    }
  }, [ws, setActive]);

  useEffect(() => {
    if (!ws) return;
    void fetchActiveTimer();
    const poll = setInterval(() => void fetchActiveTimer(), 30_000);
    return () => clearInterval(poll);
  }, [ws, fetchActiveTimer]);

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const toggleOccupancyOverlay = useCallback(() => {
    setShowOccupancyOverlay((prev) => {
      const next = !prev;
      localStorage.setItem("kloqra-show-occupancy-overlay", String(next));
      return next;
    });
  }, []);

  const weekStart = useMemo(
    () => startOfWeekWithPreference(anchor, weekStartPref),
    [anchor, weekStartPref]
  );
  const monthStart = useMemo(() => startOfMonth(anchor), [anchor]);

  const [submissionByKey, setSubmissionByKey] = useState<Map<string, TimesheetPeriodDto>>(
    () => new Map()
  );

  const refreshSubmissions = useCallback(async () => {
    if (!ws) return;
    const dates = new Set<string>([anchor.toISOString()]);
    for (const log of logs) {
      dates.add(log.startTime);
    }
    try {
      const merged = new Map<string, TimesheetPeriodDto>();
      for (const date of dates) {
        const params = new URLSearchParams({ date });
        const res = await api<ListTimesheetSubmissionsResponseDto>(
          `${ROUTES.TIMESHEETS.MY_SUBMISSIONS}?${params}`,
          { workspaceId: ws }
        );
        for (const item of res.items) {
          merged.set(`${item.projectId}:${item.periodStart}`, item);
        }
      }
      setSubmissionByKey(merged);
    } catch {
      setSubmissionByKey(new Map());
    }
  }, [ws, anchor, logs]);

  useEffect(() => {
    void refreshSubmissions();
  }, [refreshSubmissions]);

  const projectForTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return undefined;
      return projects.find((p) => p.id === task.projectId);
    },
    [tasks, projects]
  );

  const isTimerEntry = useCallback((log: TimeLogDto) => log.source === "timer", []);

  const isEntryLocked = useCallback(
    (log: TimeLogDto) => {
      const project = projectForTask(log.taskId);
      if (!project?.timesheetApprovalEnabled) return false;
      const start = new Date(log.startTime);
      for (const sub of submissionByKey.values()) {
        if (sub.projectId !== project.id) continue;
        if (sub.status !== "SUBMITTED" && sub.status !== "APPROVED") continue;
        const pStart = new Date(sub.periodStart);
        const pEnd = new Date(sub.periodEnd);
        if (start >= pStart && start <= pEnd) return true;
      }
      return false;
    },
    [projectForTask, submissionByKey]
  );

  const calendarDays = useMemo(() => {
    if (view === "day") return [startOfDay(anchor)];
    if (view === "week") return getWeekDays(weekStart);
    return [];
  }, [view, anchor, weekStart]);

  const visibleRange = useMemo(() => {
    if (view === "day") {
      const y = anchor.getFullYear();
      const m = anchor.getMonth() + 1;
      const d = anchor.getDate();
      const from = localMidnightUtcInZone(y, m, d, timezone);
      const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
      return { from, to };
    }
    if (view === "week") {
      const y = weekStart.getFullYear();
      const m = weekStart.getMonth() + 1;
      const d = weekStart.getDate();
      const from = localMidnightUtcInZone(y, m, d, timezone);
      const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
      return { from, to };
    }
    if (view === "month") {
      const y = monthStart.getFullYear();
      const m = monthStart.getMonth() + 1;
      const from = localMidnightUtcInZone(y, m, 1, timezone);
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const to = new Date(
        localMidnightUtcInZone(y, m, lastDay, timezone).getTime() + 24 * 60 * 60 * 1000
      );
      return { from, to };
    }
    return null;
  }, [view, anchor, weekStart, monthStart, timezone]);

  const rangeLabel = useMemo(() => {
    if (!displayFormat) {
      if (view === "day") return anchor.toLocaleDateString();
      if (view === "week") return weekStart.toLocaleDateString();
      return monthStart.toLocaleDateString();
    }
    if (view === "day") return formatDayRangeLabel(anchor, displayFormat);
    if (view === "week") return formatWeekRangeLabel(weekStart, displayFormat);
    return formatMonthYearLabel(monthStart, displayFormat);
  }, [view, anchor, weekStart, monthStart, displayFormat]);

  const taskLabel = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return "Unknown task";
      const project = projects.find((p) => p.id === task.projectId);
      return formatTaskLabel(project, task.taskName, workspaceNamesById);
    },
    [tasks, projects, workspaceNamesById]
  );

  const taskInfo = useCallback(
    (taskId: string): CalendarTaskInfo => {
      const task = tasks.find((t) => t.id === taskId);
      const project = task ? projects.find((p) => p.id === task.projectId) : undefined;
      return {
        taskName: task?.taskName ?? "Unknown task",
        categoryName: task?.categoryName ?? "General",
        projectName: project?.name
      };
    },
    [tasks, projects]
  );

  const entryColor = useCallback(
    (taskId: string) => colorForTask(taskId, tasks, projects),
    [tasks, projects]
  );

  const refreshLogs = useCallback(async () => {
    try {
      const path = visibleRange
        ? buildLogsQuery(visibleRange.from, visibleRange.to)
        : ROUTES.TIMELOGS.LIST;
      const res = await api<ListTimeLogsResponseDto>(path, { workspaceId: ws });
      setLogs(res.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load time entries.");
    }
  }, [ws, setLogs, visibleRange]);

  const refreshOccupancy = useCallback(async () => {
    if (!visibleRange) {
      setOccupancy([]);
      return;
    }
    try {
      const res = await api<ListTimeLogOccupancyResponseDto>(
        buildOccupancyQuery(visibleRange.from, visibleRange.to),
        { workspaceId: ws }
      );
      setOccupancy(res.items);
    } catch (e) {
      setOccupancy([]);
      if (e instanceof Error && e.message.includes("404")) {
        toast.error("Occupied slots unavailable — restart the API (pnpm serve).");
      }
    }
  }, [ws, visibleRange]);

  const overlapConflictMessage = useCallback(
    (conflict: { workspaceName: string; label: string; startTime: string; endTime: string }) => {
      return formatOverlapError(
        occupancyConflictLabel(conflict),
        new Date(conflict.startTime),
        new Date(conflict.endTime),
        timezone
      );
    },
    [timezone]
  );

  useEffect(() => {
    if (!ws) return;
    setCalendarLoading(true);
    void Promise.all([refreshLogs(), refreshOccupancy()]).finally(() => setCalendarLoading(false));
  }, [ws, refreshLogs, refreshOccupancy]);

  useEffect(() => {
    if (timezone) {
      setAnchor(todayInZone(timezone));
    }
  }, [timezone]);

  useEffect(() => {
    if (!ws) return;
    fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId: ws }).then(setTasks);
    fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
  }, [ws, setTasks, setProjects]);

  function goToday() {
    setAnchor(todayInZone(timezone));
  }

  function goPrev() {
    if (view === "month") setAnchor((d) => addMonths(d, -1));
    else if (view === "day") setAnchor((d) => addDays(d, -1));
    else setAnchor((d) => addDays(d, -7));
  }

  function goNext() {
    if (view === "month") setAnchor((d) => addMonths(d, 1));
    else if (view === "day") setAnchor((d) => addDays(d, 1));
    else setAnchor((d) => addDays(d, 7));
  }

  function openDraft(next: TimeEntryDraft, log: TimeLogDto | null = null) {
    if (log && isEntryLocked(log)) {
      setError("This entry is locked (submitted or approved) and cannot be edited.");
      return;
    }
    setEditingLog(log);
    setDraft(next);
    setError(null);
    setDialogOpen(true);
  }

  function openCreateSlot(day: Date, hour: number, minute: number) {
    if (showOccupancyOverlay) {
      const index = slotIndexFromTime(hour, minute);
      if (index >= 0) {
        const dateKey = calendarDateKey(day, timezone);
        const segments = buildDayOccupancySegments(dateKey, occupancy, timezone, ws);
        const { start, end } = slotIntervalForIndex(dateKey, index, timezone);
        const conflict = segments.find((seg) => start < seg.end && end > seg.start);
        if (conflict) {
          const msg = formatOverlapError(
            `${conflict.workspaceName}: ${conflict.label}`,
            conflict.start,
            conflict.end,
            timezone
          );
          setError(msg);
          toast.error(msg);
          return;
        }
      }
    }
    openDraft(draftFromSlot(day, hour, minute, timezone));
  }

  function openCreateRange(day: Date, startIndex: number, endIndex: number) {
    if (showOccupancyOverlay) {
      const dateKey = calendarDateKey(day, timezone);
      const segments = buildDayOccupancySegments(dateKey, occupancy, timezone, ws);
      const conflict = rangeOccupiedElsewhere(dateKey, startIndex, endIndex, segments, timezone);
      if (conflict) {
        const msg = formatOverlapError(
          `${conflict.workspaceName}: ${conflict.label}`,
          conflict.start,
          conflict.end,
          timezone
        );
        setError(msg);
        toast.error(msg);
        return;
      }
    }
    openDraft(draftFromSlotRange(day, startIndex, endIndex, timezone));
  }

  function openEditEntry(log: TimeLogDto) {
    openDraft(draftFromLog(log, tasks, timezone), log);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingLog(null);
    setDraft(null);
    setError(null);
  }

  async function saveEntry() {
    if (editingLog && isEntryLocked(editingLog)) return;
    if (!draft || !canSaveTaskDraft(draft)) {
      setError("Select a project and a task.");
      return;
    }
    const { startTime, endTime } = draftToIsoRange(draft, timezone);
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }
    const conflict = findOccupancyConflict(occupancy, start, end, editingLog?.id);
    if (conflict) {
      const msg = overlapConflictMessage(conflict);
      setError(msg);
      toast.error(msg);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const taskId = draft.taskSelection;
      if (!taskId) {
        setError("Select a task to log time.");
        return;
      }
      const body = {
        taskId,
        startTime,
        endTime,
        description: draft.description || undefined,
        isBillable: draft.isBillable
      };
      if (editingLog) {
        await api(`/timelogs/${editingLog.id}`, {
          method: "PATCH",
          workspaceId: ws,
          body: JSON.stringify(body)
        });
      } else {
        await api(ROUTES.TIMELOGS.CREATE, {
          method: "POST",
          workspaceId: ws,
          body: JSON.stringify(body)
        });
      }
      await Promise.all([refreshLogs(), refreshOccupancy()]);
      closeDialog();
      toast.success(editingLog ? "Time entry updated!" : "Time entry created!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save entry";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(log?: TimeLogDto) {
    const target = log ?? editingLog;
    if (!target) return;
    if (isEntryLocked(target)) return;
    // Show confirm dialog instead of window.confirm
    setConfirmDeleteLog(target);
  }

  async function confirmDelete() {
    const target = confirmDeleteLog;
    setConfirmDeleteLog(null);
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/timelogs/${target.id}`, { method: "DELETE", workspaceId: ws });
      await Promise.all([refreshLogs(), refreshOccupancy()]);
      if (editingLog?.id === target.id) closeDialog();
      toast.success("Time entry deleted!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete entry";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function duplicateEntry(log: TimeLogDto, start: Date, end: Date) {
    if (isEntryLocked(log)) return;
    if (end <= start) return;
    const conflict = findOccupancyConflict(occupancy, start, end);
    if (conflict) {
      const msg = overlapConflictMessage(conflict);
      setError(msg);
      toast.error(msg);
      return;
    }
    setError(null);
    try {
      const created = await api<TimeLogDto>(ROUTES.TIMELOGS.CREATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          taskId: log.taskId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          description: log.description ?? undefined,
          isBillable: log.isBillable
        })
      });
      await Promise.all([refreshLogs(), refreshOccupancy()]);
      openDraft(draftFromLog(created, tasks, timezone), created);
      toast.success("Time entry duplicated!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not duplicate entry";
      setError(msg);
      toast.error(msg);
    }
  }

  async function updateEntryTimes(log: TimeLogDto, start: Date, end: Date, errorLabel: string) {
    if (isEntryLocked(log) || isTimerEntry(log)) return;
    if (end <= start) return;

    const conflict = findOccupancyConflict(occupancy, start, end, log.id);
    if (conflict) {
      const msg = overlapConflictMessage(conflict);
      setError(msg);
      toast.error(msg);
      return;
    }

    setError(null);
    try {
      await api(`/timelogs/${log.id}`, {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({
          startTime: start.toISOString(),
          endTime: end.toISOString()
        })
      });
      await Promise.all([refreshLogs(), refreshOccupancy()]);
      toast.success("Time entry updated!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : errorLabel;
      setError(msg);
      toast.error(msg);
    }
  }

  const resizeEntry = (log: TimeLogDto, start: Date, end: Date) =>
    updateEntryTimes(log, start, end, "Could not resize entry");

  const moveEntry = (log: TimeLogDto, start: Date, end: Date) =>
    updateEntryTimes(log, start, end, "Could not move entry");

  function onMonthDayClick(day: Date) {
    setAnchor(startOfDay(day));
    setView("day");
  }

  return (
    <div className="space-y-4">
      <AppBar
        title={
          <span className="inline-flex items-center gap-2">
            Timesheet
            <Badge variant="secondary" className="font-normal text-xs">
              {timezone}
            </Badge>
          </span>
        }
        description="Drag slots, drag blocks to move, resize edges, Ctrl+drag to duplicate."
        actions={
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            {(["day", "week", "month"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={view === mode ? "default" : "ghost"}
                className="h-9 capitalize"
                onClick={() => setView(mode)}
              >
                {mode}
              </Button>
            ))}
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goPrev}
            >
              ‹
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goNext}
            >
              ›
            </Button>
          </div>
          <span className="text-sm font-medium">{rangeLabel}</span>
        </div>

        {(view === "day" || view === "week") && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleOccupancyOverlay}
            className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 h-8"
          >
            {showOccupancyOverlay ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Hide occupied slots
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Show occupied slots
              </>
            )}
          </Button>
        )}
      </div>

      {showOccupancyOverlay && (view === "day" || view === "week") && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground">
            <span className="occupancy-legend-swatch inline-block h-2.5 w-3 rounded-[2px]" />
            Busy elsewhere
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 px-2.5 py-0.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            Locked
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-dotted border-muted-foreground/30 px-2.5 py-0.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            Timer
          </span>
          {isActiveTimer(activeTimer) && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live timer
            </span>
          )}
        </div>
      )}

      {error && !dialogOpen && <p className="text-sm text-destructive">{error}</p>}

      {calendarLoading ? (
        <CenteredLoader label="Loading timesheet…" />
      ) : view === "month" ? (
        <TimesheetMonth
          month={monthStart}
          logs={logs}
          entryColor={entryColor}
          onDayClick={onMonthDayClick}
          timezone={timezone}
        />
      ) : (
        <TimesheetCalendar
          view={view}
          days={calendarDays}
          logs={logs}
          occupancy={occupancy}
          workspaceId={ws}
          showOccupancyOverlay={showOccupancyOverlay}
          taskName={(id) => taskLabel(id)}
          taskInfo={taskInfo}
          entryColor={entryColor}
          activeTimer={isActiveTimer(activeTimer) ? activeTimer : null}
          liveElapsedSec={liveElapsedSec}
          isEntryLocked={isEntryLocked}
          isTimerEntry={isTimerEntry}
          overlapConflictMessage={overlapConflictMessage}
          onSlotClick={openCreateSlot}
          onSlotRangeSelect={openCreateRange}
          onEntryClick={openEditEntry}
          onEntryResize={resizeEntry}
          onEntryMove={moveEntry}
          onEntryDuplicate={duplicateEntry}
          readOnly={false}
          timezone={timezone}
          displayFormat={displayFormat ?? undefined}
        />
      )}

      <TimeEntryDialog
        open={dialogOpen}
        title={editingLog ? "Edit time entry" : "Log time"}
        draft={draft}
        projects={projects}
        tasks={tasks}
        taskLabel={taskLabel}
        workspaceNames={workspaceNamesById}
        editingLog={editingLog}
        saving={saving}
        error={error}
        readOnly={editingLog ? isEntryLocked(editingLog) : false}
        workspaceId={ws}
        onClose={closeDialog}
        onDraftChange={setDraft}
        onSave={saveEntry}
        onDelete={editingLog && !isEntryLocked(editingLog) ? deleteEntry : undefined}
        timezone={timezone}
      />

      <ConfirmDialog
        open={confirmDeleteLog !== null}
        title="Delete this entry?"
        description="This can't be undone."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmDeleteLog(null)}
      />
    </div>
  );
}
