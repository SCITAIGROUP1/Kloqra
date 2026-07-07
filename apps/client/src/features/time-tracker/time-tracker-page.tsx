"use client";

import { ROUTES, resolveEffectiveTimezone } from "@kloqra/contracts";
import type {
  BatchTimeLogsResponseDto,
  CategoryDto,
  ListTimesheetSubmissionsResponseDto,
  TimeLogDto,
  TimesheetPeriodDto,
  UserProfileDto
} from "@kloqra/contracts";
import { AppBar, ConfirmDialog } from "@kloqra/ui";
import { api as sharedApi, commitTimelogMutation } from "@kloqra/web-shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { todayInZone } from "../timesheet/calendar-utils";
import type { TimesheetDisplayFormat } from "../timesheet/display-format";
import {
  canSaveTaskDraft,
  draftFromLog,
  draftFromSlot,
  draftToIsoRange,
  type TimeEntryDraft
} from "../timesheet/time-entry-draft";
import { validateTimeEntryOverlap } from "../timesheet/validate-time-entry-overlap";
import {
  isTimeEntryLocked,
  isTimeEntryInactive,
  LOCKED_ENTRY_MESSAGE
} from "./entry-approval-status";
import { buildWeekGroupsForRange } from "./group-logs-by-week";
import type { BillabilityFilter } from "./time-tracker-filters-panel";
import { TimeEntryDialog, TimeTrackerWeekList } from "./time-tracker-lazy";
import {
  inclusiveDateKeysFromPeriod,
  matchTimeTrackerPeriod,
  periodLabelForSelection,
  resolveTimeTrackerDateRange,
  type TimeTrackerPeriodSelection
} from "./time-tracker-period";
import { TimeTrackerStatCards } from "./time-tracker-stat-cards";
import { computeTimeTrackerStats } from "./time-tracker-stats";
import { TimeTrackerToolbar } from "./time-tracker-toolbar";
import { formatVisibleWeeksSummary } from "./time-tracker-week-list";
import { useTimeTrackerLogs } from "./use-time-tracker-logs";
import { useIsImpersonating } from "@/hooks/use-is-impersonating";
import { useTimelogStaleRefetch } from "@/hooks/use-timelog-stale-refetch";
import { api } from "@/lib/api";
import { loadEntryCatalog } from "@/lib/entry-catalog";
import { colorForTask } from "@/lib/project-color-styles";
import { formatTaskLabel } from "@/lib/project-labels";
import { useOfflineStore } from "@/stores/offline-store";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function TimeTrackerPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const isImpersonating = useIsImpersonating();
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

  const [period, setPeriod] = useState<TimeTrackerPeriodSelection>("this_week");
  const [rangeFrom, setRangeFrom] = useState(
    () => inclusiveDateKeysFromPeriod("this_week", "UTC").from
  );
  const [rangeTo, setRangeTo] = useState(() => inclusiveDateKeysFromPeriod("this_week", "UTC").to);
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

  useEffect(() => {
    if (period === "custom") return;
    const keys = inclusiveDateKeysFromPeriod(period, timezone, weekStartPref);
    setRangeFrom(keys.from);
    setRangeTo(keys.to);
  }, [period, timezone, weekStartPref]);

  const visibleRange = useMemo(
    () => resolveTimeTrackerDateRange(rangeFrom, rangeTo, timezone),
    [rangeFrom, rangeTo, timezone]
  );

  const periodLabel = useMemo(
    () => periodLabelForSelection(period, rangeFrom, rangeTo, timezone),
    [period, rangeFrom, rangeTo, timezone]
  );

  function handlePeriodChange(next: TimeTrackerPeriodSelection) {
    setPeriod(next);
    if (next === "custom") return;
    const keys = inclusiveDateKeysFromPeriod(next, timezone, weekStartPref);
    setRangeFrom(keys.from);
    setRangeTo(keys.to);
  }

  function handleRangeChange(from: string, to: string) {
    setRangeFrom(from);
    setRangeTo(to);
    setPeriod(matchTimeTrackerPeriod(from, to, timezone, weekStartPref));
  }

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
    error: logsError,
    refresh: refreshLogs
  } = useTimeTrackerLogs(ws, serverFilters);

  const [weeksPerPage, setWeeksPerPage] = useState(1);
  const [page, setPage] = useState(1);

  const filterResetKey = useMemo(
    () =>
      JSON.stringify({
        from: serverFilters.from.toISOString(),
        to: serverFilters.to.toISOString(),
        projectId: serverFilters.projectId ?? "",
        categoryId: serverFilters.categoryId ?? "",
        taskId: serverFilters.taskId ?? "",
        search: serverFilters.search ?? "",
        billableOnly: serverFilters.billableOnly ?? false
      }),
    [serverFilters]
  );

  useEffect(() => {
    setPage(1);
  }, [filterResetKey]);

  const allWeekGroups = useMemo(
    () => buildWeekGroupsForRange(rangeFrom, rangeTo, logs, timezone, weekStartPref),
    [rangeFrom, rangeTo, logs, timezone, weekStartPref]
  );

  const totalWeekCount = allWeekGroups.length;
  const totalWeekPages = Math.max(1, Math.ceil(totalWeekCount / weeksPerPage));

  useEffect(() => {
    if (page > totalWeekPages) {
      setPage(totalWeekPages);
    }
  }, [page, totalWeekPages]);

  const visibleWeekGroups = useMemo(() => {
    const start = (page - 1) * weeksPerPage;
    return allWeekGroups.slice(start, start + weeksPerPage);
  }, [allWeekGroups, page, weeksPerPage]);

  const weekTotals = useMemo(() => {
    const map = new Map<string, { totalSec: number; billableSec: number }>();
    for (const group of allWeekGroups) {
      map.set(group.weekKey, { totalSec: group.totalSec, billableSec: group.billableSec });
    }
    return map;
  }, [allWeekGroups]);

  const weekRangeSummary = useMemo(
    () => formatVisibleWeeksSummary(visibleWeekGroups, timezone),
    [visibleWeekGroups, timezone]
  );

  const setWeeksPerPageAndResetPage = useCallback((next: number) => {
    setWeeksPerPage(next);
    setPage(1);
  }, []);

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

  const refreshTimelogSurface = useCallback(async () => {
    await Promise.all([refreshLogs(), refreshSubmissions()]);
  }, [refreshLogs, refreshSubmissions]);

  useTimelogStaleRefetch(
    ws,
    () => {
      void refreshTimelogSurface();
    },
    Boolean(ws)
  );

  useEffect(() => {
    if (!ws) return;
    void loadEntryCatalog(ws).then(({ tasks, projects, categories }) => {
      setTasks(ws, tasks);
      setProjects(ws, projects);
      setCategories(categories);
    });
  }, [ws, setTasks, setProjects]);

  const projectForTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return undefined;
      return projects.find((p) => p.id === task.projectId);
    },
    [tasks, projects]
  );

  const taskForLog = useCallback((taskId: string) => tasks.find((t) => t.id === taskId), [tasks]);

  const categoryForTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return undefined;
      return categories.find((c) => c.id === task.categoryId);
    },
    [tasks, categories]
  );

  const isEntryInactive = useCallback(
    (log: TimeLogDto) =>
      isTimeEntryInactive(
        projectForTask(log.taskId),
        taskForLog(log.taskId),
        categoryForTask(log.taskId)
      ),
    [projectForTask, taskForLog, categoryForTask]
  );

  const isSubmissionLocked = useCallback(
    (log: TimeLogDto) => isTimeEntryLocked(log, projectForTask(log.taskId), submissionByKey),
    [projectForTask, submissionByKey]
  );

  const isEntryReadOnly = useCallback(
    (log: TimeLogDto) => isEntryInactive(log) || isSubmissionLocked(log),
    [isEntryInactive, isSubmissionLocked]
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

  const stats = useMemo(
    () => computeTimeTrackerStats(logs, periodLabel, projects, tasks, submissionByKey),
    [logs, periodLabel, projects, tasks, submissionByKey]
  );

  const filtersPending = search.trim() !== debouncedSearch;

  const pageError = error ?? logsError;

  function clearFilters() {
    setCategoryFilter("");
    setTaskFilter("");
    setBillability("all");
  }

  function openDraft(next: TimeEntryDraft, log: TimeLogDto | null = null) {
    setEditingLog(log);
    setDraft(next);
    setError(null);
    setDialogOpen(true);
  }

  function openAddEntry() {
    if (isImpersonating) return;
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
    if (isImpersonating) return;
    if (editingLog && isEntryReadOnly(editingLog)) return;
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
    const overlapMsg = await validateTimeEntryOverlap(ws, start, end, timezone, editingLog?.id);
    if (overlapMsg) {
      setError(overlapMsg);
      toast.error(overlapMsg);
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
      const isRecurring = !editingLog && draft.recurrence && draft.recurrence !== "none";
      if (isRecurring) {
        if (!draft.repeatUntil) {
          setError("Please select an end date for the recurrence.");
          setSaving(false);
          return;
        }
        const body = {
          taskId,
          localStartTime: draft.startTime,
          localEndTime: draft.endTime,
          startDate: draft.date,
          endDate: draft.repeatUntil,
          recurrence: draft.recurrence,
          timezone,
          description: draft.description || undefined,
          isBillable: draft.isBillable
        };
        const res = await api<BatchTimeLogsResponseDto>(ROUTES.TIMELOGS.CREATE_BATCH, {
          method: "POST",
          workspaceId: ws,
          body: JSON.stringify(body)
        });
        await commitTimelogMutation(ws, refreshTimelogSurface, {
          type: "upsertMany",
          logs: res.items
        });
        closeDialog();
        if (res.skippedCount > 0) {
          toast.success(
            `Logged ${res.createdCount} entries. Skipped ${res.skippedCount} conflicts.`
          );
        } else {
          toast.success(`Logged ${res.createdCount} recurring entries!`);
        }
        return;
      }
      const body = {
        taskId,
        startTime,
        endTime,
        description: draft.description || undefined,
        isBillable: draft.isBillable
      };

      const isOffline = useOfflineStore.getState().isOffline;
      const task = tasks.find((t) => t.id === taskId);
      const projectId = task?.projectId;

      if (isOffline) {
        if (editingLog) {
          const isOfflineLog = editingLog.id.startsWith("temp-");
          if (isOfflineLog) {
            useOfflineStore.getState().updateOfflineLog(editingLog.id, {
              taskId,
              projectId,
              startTime,
              endTime,
              description: draft.description || undefined,
              isBillable: draft.isBillable
            });
            closeDialog();
            toast.success("Offline time entry updated!");
            return;
          } else {
            toast.error("Editing existing server entries requires an online connection.");
            setSaving(false);
            return;
          }
        } else {
          useOfflineStore.getState().addOfflineLog({
            taskId,
            projectId,
            startTime,
            endTime,
            description: draft.description || undefined,
            isBillable: draft.isBillable
          });
          closeDialog();
          toast.success("Time entry created offline!");
          return;
        }
      }

      if (editingLog) {
        const updated = await api<TimeLogDto>(`/timelogs/${editingLog.id}`, {
          method: "PATCH",
          workspaceId: ws,
          body: JSON.stringify(body)
        });
        await commitTimelogMutation(ws, refreshTimelogSurface, { type: "upsert", log: updated });
      } else {
        const created = await api<TimeLogDto>(ROUTES.TIMELOGS.CREATE, {
          method: "POST",
          workspaceId: ws,
          body: JSON.stringify(body)
        });
        await commitTimelogMutation(ws, refreshTimelogSurface, { type: "upsert", log: created });
      }
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
    if (isImpersonating) return;
    if (isEntryReadOnly(log)) {
      toast.error(LOCKED_ENTRY_MESSAGE);
      return;
    }
    setConfirmDeleteLog(log);
  }

  async function confirmDelete() {
    if (isImpersonating) return;
    const target = confirmDeleteLog;
    setConfirmDeleteLog(null);
    if (!target) return;
    if (isEntryReadOnly(target)) {
      toast.error(LOCKED_ENTRY_MESSAGE);
      return;
    }

    const isOfflineLog = target.id.startsWith("temp-");
    const isOffline = useOfflineStore.getState().isOffline;

    if (isOfflineLog) {
      useOfflineStore.getState().removeOfflineLog(target.id);
      if (editingLog?.id === target.id) closeDialog();
      toast.success("Offline time entry deleted!");
      return;
    }

    if (isOffline) {
      useOfflineStore.getState().deleteServerLogOffline(target.id);
      if (editingLog?.id === target.id) closeDialog();
      toast.success("Time entry queued for deletion!");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api(`/timelogs/${target.id}`, { method: "DELETE", workspaceId: ws });
      await commitTimelogMutation(ws, refreshTimelogSurface, {
        type: "remove",
        logId: target.id
      });
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
        onPeriodChange={handlePeriodChange}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onRangeChange={handleRangeChange}
        weekStartsOn={weekStartPref === "sunday" ? 0 : 1}
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
        readOnly={isImpersonating}
      />

      <TimeTrackerStatCards stats={stats} loading={logsLoading || filtersPending} />

      {pageError && !dialogOpen ? <p className="text-sm text-destructive">{pageError}</p> : null}

      <TimeTrackerWeekList
        groups={visibleWeekGroups}
        weekTotals={weekTotals}
        tasks={tasks}
        projects={projects}
        workspaceNamesById={workspaceNamesById}
        submissionByKey={submissionByKey}
        entryColor={entryColor}
        isEntryLocked={isSubmissionLocked}
        isEntryInactive={isEntryInactive}
        onEdit={openEditEntry}
        onDelete={deleteEntry}
        timezone={timezone}
        weekStartPref={weekStartPref}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        loading={logsLoading || filtersPending}
        page={page}
        weeksPerPage={weeksPerPage}
        onWeeksPerPageChange={setWeeksPerPageAndResetPage}
        onPageChange={setPage}
        totalWeekPages={totalWeekPages}
        totalWeekCount={totalWeekCount}
        weekRangeSummary={weekRangeSummary}
        readOnly={isImpersonating}
      />

      <TimeEntryDialog
        open={dialogOpen}
        title={editingLog ? "Edit time entry" : "Add time entry"}
        draft={draft}
        projects={projects}
        tasks={tasks}
        categories={categories}
        taskLabel={taskLabel}
        workspaceNames={workspaceNamesById}
        workspaceId={ws}
        timezone={timezone}
        saving={saving}
        error={error}
        editingLog={editingLog}
        readOnly={isImpersonating || (editingLog ? isEntryReadOnly(editingLog) : false)}
        onDraftChange={setDraft}
        onClose={closeDialog}
        onSave={() => void saveEntry()}
        onDelete={
          !isImpersonating && editingLog && !isEntryReadOnly(editingLog)
            ? () => deleteEntry(editingLog)
            : undefined
        }
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
