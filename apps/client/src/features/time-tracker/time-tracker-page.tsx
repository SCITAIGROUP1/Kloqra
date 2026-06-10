"use client";

import { ROUTES, resolveEffectiveTimezone } from "@kloqra/contracts";
import type {
  CategoryDto,
  ListTimesheetSubmissionsResponseDto,
  ProjectDto,
  TaskDto,
  TimeLogDto,
  TimesheetPeriodDto,
  UserProfileDto
} from "@kloqra/contracts";
import { AppBar, ConfirmDialog } from "@kloqra/ui";
import { api as sharedApi, fetchListItems } from "@kloqra/web-shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { todayInZone } from "../timesheet/calendar-utils";
import type { TimesheetDisplayFormat } from "../timesheet/display-format";
import {
  TimeEntryDialog,
  canSaveTaskDraft,
  draftFromLog,
  draftFromSlot,
  draftToIsoRange,
  type TimeEntryDraft
} from "../timesheet/time-entry-dialog";
import { groupLogsByWeek } from "./group-logs-by-week";
import type { BillabilityFilter } from "./time-tracker-filters-panel";
import { resolveTimeTrackerPeriod, type TimeTrackerPeriodPreset } from "./time-tracker-period";
import { TimeTrackerStatCards } from "./time-tracker-stat-cards";
import { computeTimeTrackerStats } from "./time-tracker-stats";
import { TimeTrackerToolbar } from "./time-tracker-toolbar";
import { TimeTrackerWeekList } from "./time-tracker-week-list";
import { useTimeTrackerLogs } from "./use-time-tracker-logs";
import { api } from "@/lib/api";
import { colorForTask } from "@/lib/project-color-styles";
import { formatTaskLabel } from "@/lib/project-labels";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function TimeTrackerPage() {
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

  const { tasks, projects, workspaceNamesById, setTasks, setProjects } = useProjectsStore();
  const [categories, setCategories] = useState<CategoryDto[]>([]);

  const [period, setPeriod] = useState<TimeTrackerPeriodPreset>("this_week");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [billability, setBillability] = useState<BillabilityFilter>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLogDto | null>(null);
  const [draft, setDraft] = useState<TimeEntryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteLog, setConfirmDeleteLog] = useState<TimeLogDto | null>(null);

  const [submissionByKey, setSubmissionByKey] = useState<Map<string, TimesheetPeriodDto>>(
    () => new Map()
  );

  const visibleRange = useMemo(
    () => resolveTimeTrackerPeriod(period, timezone, weekStartPref),
    [period, timezone, weekStartPref]
  );

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const serverFilters = useMemo(
    () => ({
      from: visibleRange.from,
      to: visibleRange.to,
      projectId: projectFilter !== "all" ? projectFilter : undefined,
      categoryId: categoryFilter || undefined,
      taskId: taskFilter || undefined,
      search: debouncedSearch || undefined,
      billableOnly: billability === "billable" || undefined
    }),
    [visibleRange, projectFilter, categoryFilter, taskFilter, debouncedSearch, billability]
  );

  const {
    logs,
    loading: logsLoading,
    loadingMore,
    hasMore,
    fullyLoaded,
    error: logsError,
    loadMore,
    refresh: refreshLogs
  } = useTimeTrackerLogs(ws, serverFilters);

  const refreshSubmissions = useCallback(async () => {
    if (!ws) return;
    const dates = new Set<string>();
    for (const log of logs) {
      dates.add(log.startTime);
    }
    if (dates.size === 0) {
      dates.add(todayInZone(timezone).toISOString());
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
  }, [ws, logs, timezone]);

  useEffect(() => {
    void refreshSubmissions();
  }, [refreshSubmissions]);

  useEffect(() => {
    if (!ws) return;
    fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId: ws }).then(setTasks);
    fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
    fetchListItems<CategoryDto>(ROUTES.CATEGORIES.LIST, { workspaceId: ws }).then(setCategories);
  }, [ws, setTasks, setProjects]);

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

  const weekGroups = useMemo(
    () => groupLogsByWeek(logs, timezone, weekStartPref),
    [logs, timezone, weekStartPref]
  );

  const stats = useMemo(
    () => computeTimeTrackerStats(logs, period, projects, tasks, submissionByKey),
    [logs, period, projects, tasks, submissionByKey]
  );

  const filtersPending = search.trim() !== debouncedSearch;

  const pageError = error ?? logsError;

  function clearFilters() {
    setCategoryFilter("");
    setTaskFilter("");
    setBillability("all");
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

  function openAddEntry() {
    const today = todayInZone(timezone);
    openDraft(draftFromSlot(today, 9, 0, timezone));
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
      await Promise.all([refreshLogs(), refreshSubmissions()]);
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

  function deleteEntry(log: TimeLogDto) {
    if (isEntryLocked(log)) return;
    setConfirmDeleteLog(log);
  }

  async function confirmDelete() {
    const target = confirmDeleteLog;
    setConfirmDeleteLog(null);
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/timelogs/${target.id}`, { method: "DELETE", workspaceId: ws });
      await Promise.all([refreshLogs(), refreshSubmissions()]);
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

  return (
    <div className="space-y-6">
      <AppBar title="Time Tracker" description="View and manage your time entries." />

      <TimeTrackerToolbar
        search={search}
        onSearchChange={setSearch}
        projectId={projectFilter}
        onProjectChange={setProjectFilter}
        period={period}
        onPeriodChange={setPeriod}
        projects={projects}
        categories={categories}
        tasks={tasks}
        workspaceNamesById={workspaceNamesById}
        filterValues={{
          categoryId: categoryFilter,
          taskId: taskFilter,
          billability
        }}
        onCategoryChange={setCategoryFilter}
        onTaskChange={setTaskFilter}
        onBillabilityChange={setBillability}
        onClearFilters={clearFilters}
        onAddEntry={openAddEntry}
      />

      <TimeTrackerStatCards stats={stats} loading={logsLoading || loadingMore || filtersPending} />

      {pageError && !dialogOpen ? <p className="text-sm text-destructive">{pageError}</p> : null}

      <TimeTrackerWeekList
        groups={weekGroups}
        tasks={tasks}
        projects={projects}
        workspaceNamesById={workspaceNamesById}
        submissionByKey={submissionByKey}
        entryColor={entryColor}
        isEntryLocked={isEntryLocked}
        onEdit={openEditEntry}
        onDelete={deleteEntry}
        timezone={timezone}
        loading={logsLoading || filtersPending}
        loadingMore={loadingMore}
        hasMore={hasMore}
        fullyLoaded={fullyLoaded}
        onLoadMore={() => void loadMore()}
      />

      <TimeEntryDialog
        open={dialogOpen}
        title={editingLog ? "Edit time entry" : "Add time entry"}
        draft={draft}
        projects={projects}
        tasks={tasks}
        taskLabel={taskLabel}
        workspaceNames={workspaceNamesById}
        workspaceId={ws}
        timezone={timezone}
        saving={saving}
        error={error}
        editingLog={editingLog}
        onDraftChange={setDraft}
        onClose={closeDialog}
        onSave={() => void saveEntry()}
        onDelete={editingLog ? () => deleteEntry(editingLog) : undefined}
      />

      <ConfirmDialog
        open={confirmDeleteLog !== null}
        title="Delete time entry?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmDeleteLog(null)}
      />
    </div>
  );
}
