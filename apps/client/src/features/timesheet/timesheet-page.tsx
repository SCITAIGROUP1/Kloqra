"use client";

import { ROUTES } from "@chronomint/contracts";
import type {
  ListTimeLogsResponseDto,
  ListTimesheetSubmissionsResponseDto,
  TimeLogDto,
  TaskDto,
  ProjectDto,
  TimesheetPeriodDto
} from "@chronomint/contracts";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ProjectColorDot,
  EmptyState,
  ConfirmDialog,
  Badge
} from "@chronomint/ui";
import { toDateInputValue } from "@chronomint/web-shared";
import { Eye, EyeOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  addDays,
  addMonths,
  formatDuration,
  formatMonthYear,
  formatWeekRange,
  getWeekDays,
  startOfMonth,
  startOfWeek,
  startOfDay,
  localMidnightUtcInZone,
  todayInZone
} from "./calendar-utils";
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
import { TimesheetStatusCard } from "./timesheet-status-card";
import { MyWeekSummary } from "@/components/my-week-summary";
import { TimesheetExport } from "@/components/timesheet-export";
import { api } from "@/lib/api";
import { colorForTask } from "@/lib/project-color-styles";
import { formatTaskLabel } from "@/lib/project-labels";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { useTimesheetStore } from "@/stores/timesheet.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

type ViewMode = "day" | "week" | "month" | "list";

function buildLogsQuery(from: Date, to: Date): string {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString()
  });
  return `${ROUTES.TIMELOGS.LIST}?${params}`;
}

export function TimesheetPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const activeWorkspace = workspaces.find((w) => w.id === ws);
  const timezone =
    typeof activeWorkspace?.settings?.timezone === "string"
      ? activeWorkspace.settings.timezone
      : "UTC";

  const { logs, setLogs } = useTimesheetStore();
  const { tasks, projects, workspaceNamesById, setTasks, setProjects } = useProjectsStore();

  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLogDto | null>(null);
  const [draft, setDraft] = useState<TimeEntryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteLog, setConfirmDeleteLog] = useState<TimeLogDto | null>(null);

  const [showSummary, setShowSummary] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("chronomint-show-timesheet-summary");
    if (saved === "false") {
      setShowSummary(false);
    }
  }, []);

  const toggleSummary = useCallback(() => {
    setShowSummary((prev) => {
      const next = !prev;
      localStorage.setItem("chronomint-show-timesheet-summary", String(next));
      return next;
    });
  }, []);

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const monthStart = useMemo(() => startOfMonth(anchor), [anchor]);

  const [submissions, setSubmissions] = useState<TimesheetPeriodDto[]>([]);
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
      setSubmissions(Array.from(merged.values()));
    } catch {
      setSubmissionByKey(new Map());
      setSubmissions([]);
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
    if (view === "day") {
      return anchor.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    }
    if (view === "week") return formatWeekRange(weekStart);
    if (view === "month") return formatMonthYear(monthStart);
    return "All entries";
  }, [view, anchor, weekStart, monthStart]);

  const taskLabel = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return "Unknown task";
      const project = projects.find((p) => p.id === task.projectId);
      return formatTaskLabel(project, task.taskName, workspaceNamesById);
    },
    [tasks, projects, workspaceNamesById]
  );

  const entryColor = useCallback(
    (taskId: string) => colorForTask(taskId, tasks, projects),
    [tasks, projects]
  );

  const refreshLogs = useCallback(async () => {
    const path = visibleRange
      ? buildLogsQuery(visibleRange.from, visibleRange.to)
      : ROUTES.TIMELOGS.LIST;
    const res = await api<ListTimeLogsResponseDto>(path, { workspaceId: ws });
    setLogs(res.items);
  }, [ws, setLogs, visibleRange]);

  useEffect(() => {
    if (!ws) return;
    void refreshLogs();
  }, [ws, refreshLogs]);

  useEffect(() => {
    if (timezone) {
      setAnchor(todayInZone(timezone));
    }
  }, [timezone]);

  useEffect(() => {
    if (!ws) return;
    api<TaskDto[]>(ROUTES.TASKS.LIST, { workspaceId: ws }).then(setTasks);
    api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
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
    openDraft(draftFromSlot(day, hour, minute, timezone));
  }

  function openCreateRange(day: Date, startIndex: number, endIndex: number) {
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
    if (new Date(endTime) <= new Date(startTime)) {
      setError("End time must be after start time.");
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
      await refreshLogs();
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
      await refreshLogs();
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
      await refreshLogs();
      openDraft(draftFromLog(created, tasks, timezone), created);
      toast.success("Time entry duplicated!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not duplicate entry";
      setError(msg);
      toast.error(msg);
    }
  }

  async function updateEntryTimes(log: TimeLogDto, start: Date, end: Date, errorLabel: string) {
    if (isEntryLocked(log)) return;
    if (end <= start) return;
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
      await refreshLogs();
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            Timesheet
            <Badge variant="secondary" className="font-normal text-xs">
              {timezone}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            Drag slots, drag blocks to move, resize edges, Ctrl+drag to duplicate.
          </p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5">
          {(["day", "week", "month", "list"] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={view === mode ? "default" : "ghost"}
              className="capitalize"
              onClick={() => setView(mode)}
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      {view !== "list" && (
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

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleSummary}
            className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 h-8"
          >
            {showSummary ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Hide summary
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Show summary
              </>
            )}
          </Button>
        </div>
      )}

      {error && !dialogOpen && <p className="text-sm text-destructive">{error}</p>}

      {showSummary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MyWeekSummary />
          {submissions.map((sub) => (
            <TimesheetStatusCard
              key={`${sub.projectId}:${sub.periodStart}`}
              statusInfo={sub}
              onSubmitted={refreshSubmissions}
              anchorDate={anchor}
            />
          ))}
          <TimesheetExport
            defaultFrom={visibleRange ? toDateInputValue(visibleRange.from) : undefined}
            defaultTo={
              visibleRange ? toDateInputValue(new Date(visibleRange.to.getTime() - 1)) : undefined
            }
          />
        </div>
      )}

      {view === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle>All entries</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <EmptyState
                title="No time entries logged"
                description="No entries yet. Use the day or week calendar views to log time."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="max-w-[240px]">
                        <span className="flex items-center gap-2 truncate">
                          <ProjectColorDot color={entryColor(log.taskId)} />
                          <span className="truncate">{taskLabel(log.taskId)}</span>
                        </span>
                      </TableCell>
                      <TableCell>{new Date(log.startTime).toLocaleString()}</TableCell>
                      <TableCell>{new Date(log.endTime).toLocaleString()}</TableCell>
                      <TableCell>{formatDuration(log.durationSec)}</TableCell>
                      <TableCell>{log.isBillable ? "Yes" : "No"}</TableCell>
                      <TableCell>{log.source}</TableCell>
                      <TableCell className="space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditEntry(log)}
                          disabled={isEntryLocked(log)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void deleteEntry(log)}
                          disabled={isEntryLocked(log)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
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
          taskName={(id) => taskLabel(id)}
          entryColor={entryColor}
          onSlotClick={openCreateSlot}
          onSlotRangeSelect={openCreateRange}
          onEntryClick={openEditEntry}
          onEntryResize={resizeEntry}
          onEntryMove={moveEntry}
          onEntryDuplicate={duplicateEntry}
          readOnly={false}
          timezone={timezone}
          showSummary={showSummary}
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
        title="Delete time entry?"
        description="This action cannot be undone. The time entry will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmDeleteLog(null)}
      />
    </div>
  );
}
