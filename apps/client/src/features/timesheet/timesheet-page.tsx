"use client";

import { ROUTES, resolveEffectiveTimezone } from "@kloqra/contracts";
import type {
  ActiveTimerDto,
  AutoStoppedTimerDto,
  ListTimeLogOccupancyResponseDto,
  ListTimesheetSubmissionsResponseDto,
  TimeLogDto,
  CategoryDto,
  TimesheetPeriodDto,
  UserProfileDto,
  BatchTimeLogsResponseDto
} from "@kloqra/contracts";
import {
  AppBar,
  Button,
  ConfirmDialog,
  Badge,
  LoadingCrossfade,
  WeekDatePicker,
  dateFromKey,
  dateKeyFromDate
} from "@kloqra/ui";
import {
  api as sharedApi,
  buildMemberSubmissionsHref,
  commitTimelogMutation,
  invalidateTimelogData,
  parseMemberTimesheetSearch,
  scopedStorageKey,
  useTimelogListQuery,
  useWorkspaceStaleRefetch
} from "@kloqra/web-shared";
import { Clock, Eye, EyeOff, Lock, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  canSaveTaskDraft,
  draftFromLog,
  draftFromSlot,
  draftFromSlotRange,
  draftToIsoRange,
  type TimeEntryDraft
} from "./time-entry-draft";
import { TimeEntryDialog, TimesheetCalendar, TimesheetMonth } from "./timesheet-lazy";
import { validateTimeEntryOverlap } from "./validate-time-entry-overlap";
import {
  countActionableSubmissions,
  useMySubmissions
} from "@/features/submissions/use-my-submissions";
import {
  isTimeEntryInactive,
  isTimeEntryLocked,
  LOCKED_ENTRY_MESSAGE
} from "@/features/time-tracker/entry-approval-status";
import { useIsImpersonating } from "@/hooks/use-is-impersonating";
import { useJiraIssues } from "@/hooks/use-jira-issues";
import { useMediaQuery } from "@/hooks/use-media-query";
import { api } from "@/lib/api";
import { loadEntryCatalog } from "@/lib/entry-catalog";
import { colorForTask } from "@/lib/project-color-styles";
import { formatTaskLabel } from "@/lib/project-labels";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { isActiveTimer, useTimerStore } from "@/stores/timer.store";

type ViewMode = "day" | "week" | "month";

const LEGACY_OVERLAY_KEY = "kloqra-show-occupancy-overlay";
const LEGACY_MOBILE_BANNER_KEY = "kloqra-timesheet-mobile-banner-dismissed";
const LEGACY_MOBILE_VIEW_INIT_KEY = "kloqra-timesheet-mobile-view-init";

function timesheetSessionKey(userId: string, base: string): string {
  const scope = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "client";
  return `kloqra:${scope}:${userId}:${base}`;
}

function migrateLegacySessionFlag(legacyKey: string, scopedKey: string): boolean {
  if (sessionStorage.getItem(scopedKey) === "1") return true;
  if (sessionStorage.getItem(legacyKey) === "1") {
    sessionStorage.setItem(scopedKey, "1");
    sessionStorage.removeItem(legacyKey);
    return true;
  }
  return false;
}

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
  const searchParams = useSearchParams();
  const deepLink = useMemo(
    () => parseMemberTimesheetSearch(searchParams.toString()),
    [searchParams]
  );
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const userId = useSessionStore((s) => s.session?.user?.id);
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
        setJiraConnected(profile.jiraConnected ?? false);
      })
      .catch(() => {});
  }, [ws]);

  const timezone = displayFormat?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [occupancy, setOccupancy] = useState<ListTimeLogOccupancyResponseDto["items"]>([]);
  const { tasks, projects, workspaceNamesById, setTasks, setProjects } = useProjectsStore();
  const [categories, setCategories] = useState<CategoryDto[]>([]);

  const [view, setView] = useState<ViewMode>(() => deepLink.view ?? "week");
  const [mobileBannerDismissed, setMobileBannerDismissed] = useState(true);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [anchor, setAnchor] = useState(() => {
    if (deepLink.date) {
      const parsed = new Date(deepLink.date);
      if (!Number.isNaN(parsed.getTime())) return startOfDay(parsed);
    }
    return startOfDay(new Date());
  });
  const { submissions: submissionNavItems } = useMySubmissions(ws, anchor, "assigned", Boolean(ws));
  const actionableSubmissionCount = useMemo(
    () => countActionableSubmissions(submissionNavItems),
    [submissionNavItems]
  );
  const [jiraConnected, setJiraConnected] = useState(false);
  const { issues: jiraIssues } = useJiraIssues(jiraConnected);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLogDto | null>(null);
  const [draft, setDraft] = useState<TimeEntryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteLog, setConfirmDeleteLog] = useState<TimeLogDto | null>(null);
  const [occupancyLoading, setOccupancyLoading] = useState(false);

  const [showOccupancyOverlay, setShowOccupancyOverlay] = useState(true);
  const { active: activeTimer, elapsedSec: liveElapsedSec, setActive, tick } = useTimerStore();

  useEffect(() => {
    if (!userId) return;
    if (ws) {
      const overlayKey = scopedStorageKey(
        "show_occupancy_overlay",
        { userId, workspaceId: ws },
        true
      );
      const legacyOverlay = localStorage.getItem(LEGACY_OVERLAY_KEY);
      if (legacyOverlay != null && localStorage.getItem(overlayKey) == null) {
        localStorage.setItem(overlayKey, legacyOverlay);
        localStorage.removeItem(LEGACY_OVERLAY_KEY);
      }
      const overlaySaved = localStorage.getItem(overlayKey) ?? legacyOverlay;
      if (overlaySaved === "false") {
        setShowOccupancyOverlay(false);
      }
    }
    const bannerKey = timesheetSessionKey(userId, "timesheet_mobile_banner_dismissed");
    setMobileBannerDismissed(migrateLegacySessionFlag(LEGACY_MOBILE_BANNER_KEY, bannerKey));
  }, [userId, ws]);

  useEffect(() => {
    if (!isMobile || !userId) return;
    if (deepLink.view) return;
    const viewInitKey = timesheetSessionKey(userId, "timesheet_mobile_view_init");
    if (migrateLegacySessionFlag(LEGACY_MOBILE_VIEW_INIT_KEY, viewInitKey)) return;
    setView("day");
    sessionStorage.setItem(viewInitKey, "1");
  }, [isMobile, deepLink.view, userId]);

  function dismissMobileBanner() {
    if (!userId) return;
    const bannerKey = timesheetSessionKey(userId, "timesheet_mobile_banner_dismissed");
    sessionStorage.setItem(bannerKey, "1");
    sessionStorage.removeItem(LEGACY_MOBILE_BANNER_KEY);
    setMobileBannerDismissed(true);
  }

  const fetchActiveTimer = useCallback(async () => {
    if (!ws) return;
    try {
      const res = await api<ActiveTimerDto | AutoStoppedTimerDto | null>(ROUTES.TIMER.ACTIVE, {
        workspaceId: ws
      });
      if (res && "autostopped" in res && res.autostopped) {
        setActive(null);
        void invalidateTimelogData(ws);
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
      if (userId && ws) {
        const overlayKey = scopedStorageKey(
          "show_occupancy_overlay",
          { userId, workspaceId: ws },
          true
        );
        localStorage.setItem(overlayKey, String(next));
        localStorage.removeItem(LEGACY_OVERLAY_KEY);
      }
      return next;
    });
  }, [userId, ws]);

  const weekStart = useMemo(
    () => startOfWeekWithPreference(anchor, weekStartPref),
    [anchor, weekStartPref]
  );
  const monthStart = useMemo(() => startOfMonth(anchor), [anchor]);

  const [submissionByKey, setSubmissionByKey] = useState<Map<string, TimesheetPeriodDto>>(
    () => new Map()
  );

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

  const isTimerEntry = useCallback((log: TimeLogDto) => log.source === "timer", []);

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

  const logsPath = useMemo(
    () =>
      visibleRange ? buildLogsQuery(visibleRange.from, visibleRange.to) : ROUTES.TIMELOGS.LIST,
    [visibleRange]
  );

  const {
    data: logsData,
    refetch: refetchLogs,
    isLoading: logsQueryLoading,
    error: logsQueryError
  } = useTimelogListQuery(ws, logsPath, Boolean(ws && visibleRange));

  const logs = logsData?.items ?? [];
  const calendarLoading = logsQueryLoading || occupancyLoading;

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

  const rangeLabel = useMemo(() => {
    if (!displayFormat) {
      const tzOpts = timezone ? { timeZone: timezone } : undefined;
      if (view === "day") return anchor.toLocaleDateString(undefined, tzOpts);
      if (view === "week") return weekStart.toLocaleDateString(undefined, tzOpts);
      return monthStart.toLocaleDateString(undefined, tzOpts);
    }
    if (view === "day") return formatDayRangeLabel(anchor, displayFormat);
    if (view === "week") return formatWeekRangeLabel(weekStart, displayFormat);
    return formatMonthYearLabel(monthStart, displayFormat);
  }, [view, anchor, weekStart, monthStart, displayFormat, timezone]);

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
    await refetchLogs();
  }, [refetchLogs]);

  useEffect(() => {
    if (!logsQueryError) return;
    toast.error(
      logsQueryError instanceof Error ? logsQueryError.message : "Could not load time entries."
    );
  }, [logsQueryError]);

  const refreshOccupancy = useCallback(async () => {
    if (!visibleRange) {
      setOccupancy([]);
      return;
    }
    setOccupancyLoading(true);
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
    } finally {
      setOccupancyLoading(false);
    }
  }, [ws, visibleRange]);

  const refreshTimelogSurface = useCallback(async () => {
    await Promise.all([refreshLogs(), refreshOccupancy()]);
  }, [refreshLogs, refreshOccupancy]);

  useWorkspaceStaleRefetch(
    ws,
    ["timelogs", "timesheet"],
    () => {
      void refreshTimelogSurface();
    },
    Boolean(ws)
  );

  useWorkspaceStaleRefetch(
    ws,
    ["submissions", "timesheet"],
    () => {
      void refreshSubmissions();
    },
    Boolean(ws)
  );

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
    void refreshOccupancy();
  }, [ws, refreshOccupancy]);

  useEffect(() => {
    if (!deepLink.date) return;
    const parsed = new Date(deepLink.date);
    if (!Number.isNaN(parsed.getTime())) {
      setAnchor(startOfDay(parsed));
    }
  }, [deepLink.date]);

  useEffect(() => {
    if (deepLink.view) {
      setView(deepLink.view);
    }
  }, [deepLink.view]);

  useEffect(() => {
    if (timezone && !deepLink.date) {
      setAnchor(todayInZone(timezone));
    }
  }, [timezone, deepLink.date]);

  useEffect(() => {
    if (!ws) return;
    void loadEntryCatalog(ws).then(({ tasks, projects, categories }) => {
      setTasks(ws, tasks);
      setProjects(ws, projects);
      setCategories(categories);
    });
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
    setEditingLog(log);
    setDraft(next);
    setError(null);
    setDialogOpen(true);
  }

  function openCreateSlot(day: Date, hour: number, minute: number) {
    if (isImpersonating) return;
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
    if (isImpersonating) return;
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
    const isRecurring = !editingLog && draft.recurrence && draft.recurrence !== "none";
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
      } else {
        const body = {
          taskId,
          startTime,
          endTime,
          description: draft.description || undefined,
          isBillable: draft.isBillable
        };
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
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save entry";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(log?: TimeLogDto) {
    if (isImpersonating) return;
    const target = log ?? editingLog;
    if (!target) return;
    if (isEntryReadOnly(target)) {
      toast.error(LOCKED_ENTRY_MESSAGE);
      return;
    }
    setConfirmDeleteLog(target);
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

  async function duplicateEntry(log: TimeLogDto, start: Date, end: Date) {
    if (isImpersonating || isEntryReadOnly(log)) return;
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
      await commitTimelogMutation(ws, refreshTimelogSurface, { type: "upsert", log: created });
      openDraft(draftFromLog(created, tasks, timezone), created);
      toast.success("Time entry duplicated!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not duplicate entry";
      setError(msg);
      toast.error(msg);
    }
  }

  async function updateEntryTimes(log: TimeLogDto, start: Date, end: Date, errorLabel: string) {
    if (isImpersonating || isEntryReadOnly(log) || isTimerEntry(log)) return;
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
      const updated = await api<TimeLogDto>(`/timelogs/${log.id}`, {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({
          startTime: start.toISOString(),
          endTime: end.toISOString()
        })
      });
      await commitTimelogMutation(ws, refreshTimelogSurface, { type: "upsert", log: updated });
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
        description={
          <>
            <span className="hidden md:inline">
              Drag slots, drag blocks to move, resize edges, Ctrl+drag to duplicate.
            </span>
            <span className="md:hidden">
              Tap slots to log time. Day view works best on small screens.
            </span>
          </>
        }
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

      {actionableSubmissionCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p>
            {actionableSubmissionCount} period{actionableSubmissionCount === 1 ? "" : "s"} ready to
            submit for review.
          </p>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs shrink-0">
            <Link href={buildMemberSubmissionsHref({ tab: "action" })}>Go to Submissions</Link>
          </Button>
        </div>
      ) : null}

      {isMobile && !mobileBannerDismissed ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm md:hidden">
          <p className="text-foreground">
            On mobile,{" "}
            <Link
              href="/time-tracker"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Time Tracker
            </Link>{" "}
            is easier for viewing and editing entries.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild size="sm" variant="outline" className="h-8 text-xs">
              <Link href="/time-tracker">Open</Link>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={dismissMobileBanner}
              aria-label="Dismiss mobile tip"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

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
          <WeekDatePicker
            anchorDate={dateKeyFromDate(anchor)}
            onChange={(key) => setAnchor(dateFromKey(key))}
            label={rangeLabel}
            weekStartsOn={weekStartPref === "sunday" ? 0 : 1}
            highlightMode={view}
            ariaLabel={
              view === "week" ? "Jump to week" : view === "month" ? "Jump to month" : "Jump to day"
            }
          />
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

      <LoadingCrossfade loading={calendarLoading} loaderLabel="Loading timesheet…">
        {view === "month" ? (
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
            isEntryLocked={isSubmissionLocked}
            isEntryInactive={isEntryInactive}
            isTimerEntry={isTimerEntry}
            overlapConflictMessage={overlapConflictMessage}
            onSlotClick={openCreateSlot}
            onSlotRangeSelect={openCreateRange}
            onEntryClick={openEditEntry}
            onEntryResize={resizeEntry}
            onEntryMove={moveEntry}
            onEntryDuplicate={duplicateEntry}
            readOnly={isImpersonating}
            timezone={timezone}
            displayFormat={displayFormat ?? undefined}
          />
        )}
      </LoadingCrossfade>

      <TimeEntryDialog
        open={dialogOpen}
        title={editingLog ? "Edit time entry" : "Log time"}
        draft={draft}
        projects={projects}
        tasks={tasks}
        categories={categories}
        taskLabel={taskLabel}
        workspaceNames={workspaceNamesById}
        editingLog={editingLog}
        saving={saving}
        error={error}
        readOnly={isImpersonating || (editingLog ? isEntryReadOnly(editingLog) : false)}
        workspaceId={ws}
        onClose={closeDialog}
        onDraftChange={setDraft}
        onSave={saveEntry}
        onDelete={
          !isImpersonating && editingLog && !isEntryReadOnly(editingLog) ? deleteEntry : undefined
        }
        timezone={timezone}
        jiraSuggestions={jiraIssues}
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
