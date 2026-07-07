"use client";

import { BRAND_NAME, ROUTES, resolveEffectiveTimezone } from "@kloqra/contracts";
import type {
  ActiveTimerDto,
  AutoStoppedTimerDto,
  ProjectDto,
  TaskDto,
  TimeLogDto
} from "@kloqra/contracts";
import {
  AppBar,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ProjectColorDot,
  SearchableSelect,
  EmptyState
} from "@kloqra/ui";
import {
  fetchListItems,
  useRefetchOnWindowFocus,
  useTimelogListQuery,
  useUserProfile,
  useWorkspaceStaleRefetch,
  commitTimelogMutation,
  todayInZone,
  localMidnightUtcInZone,
  toDateKeyInZone
} from "@kloqra/web-shared";
import { Play, Pause, Square } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { formatAutoStopToastMessage } from "./timer-autostop-message";
import { DailyGoalWidget, QuickActions, StaleTimerDialog } from "./timer-lazy";
import { resolveTimerStartErrorMessage } from "./timer-start-error";
import { JiraIssuePicker } from "@/components/jira-issue-picker";
import { useIsImpersonating } from "@/hooks/use-is-impersonating";
import { useJiraIssues } from "@/hooks/use-jira-issues";
import { useTimelogStaleRefetch } from "@/hooks/use-timelog-stale-refetch";
import { api } from "@/lib/api";
import { formatProjectLabel, formatTaskLabel } from "@/lib/project-labels";
import { useOfflineStore } from "@/stores/offline-store";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { isActiveTimer, useTimerStore } from "@/stores/timer.store";

function formatElapsed(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "00:00:00";
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Animated SVG clock ring — advances once per second, full circle = 1 hour */
function TimerRing({
  elapsedSec,
  active,
  isPaused = false,
  size = 200
}: {
  elapsedSec: number;
  active: boolean;
  isPaused?: boolean;
  size?: number;
}) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  // Progress within the current hour (0–3600 s)
  const hourProgress = (elapsedSec % 3600) / 3600;
  const strokeDashoffset = circumference * (1 - hourProgress);
  const cx = size / 2;
  const cy = size / 2;

  const strokeClass = !active
    ? "stroke-muted"
    : isPaused
      ? "stroke-amber-500"
      : "stroke-primary transition-all duration-1000 ease-linear";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          className="stroke-muted/40"
          strokeWidth={8}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          className={strokeClass}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>

      {/* Pulse glow when active & not paused */}
      {active && !isPaused && (
        <span
          className="absolute inset-0 rounded-full animate-pulse opacity-10 bg-primary"
          style={{ borderRadius: "50%" }}
          aria-hidden
        />
      )}

      {/* Inner content slot */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl tabular-nums tracking-tight font-semibold">
          {formatElapsed(elapsedSec)}
        </span>
        {active &&
          (isPaused ? (
            <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-500">
              <Pause className="size-3" aria-hidden />
              Paused Break
            </span>
          ) : (
            <span className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" aria-hidden />
              Recording
            </span>
          ))}
      </div>
    </div>
  );
}

export function TimerPage() {
  const session = useSessionStore((s) => s.session);
  const { active, elapsedSec, isPaused, setActive, tick } = useTimerStore();
  const { tasks, projects, workspaceNamesById, setTasks, setProjects } = useProjectsStore();
  const ws = session?.workspaceId ?? getWorkspaceId() ?? "";
  const { profile } = useUserProfile();
  const timezone = useMemo(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return resolveEffectiveTimezone(profile?.preferences ?? {}, browserTz);
  }, [profile]);

  const [projectId, setProjectId] = useState("");
  const [taskChoice, setTaskChoice] = useState("");
  const [stopDescription, setStopDescription] = useState("");
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recentLogsQueryPath = useMemo(() => {
    if (!ws) return ROUTES.TIMELOGS.LIST;
    const today = todayInZone(timezone);
    const ty = today.getFullYear();
    const tm = today.getMonth() + 1;
    const td = today.getDate();
    const todayStart = localMidnightUtcInZone(ty, tm, td, timezone);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    const startOfRecent = new Date(todayStart.getTime() - 13 * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      from: startOfRecent.toISOString(),
      to: todayEnd.toISOString()
    });
    return `${ROUTES.TIMELOGS.LIST}?${params}`;
  }, [ws, timezone]);

  const { data: recentLogsData, refetch: refetchRecentLogs } = useTimelogListQuery(
    ws,
    recentLogsQueryPath,
    Boolean(ws)
  );

  const recentLogs = recentLogsData?.items ?? [];

  const [jiraConnected, setJiraConnected] = useState(false);
  const { issues: jiraIssues } = useJiraIssues(jiraConnected);
  const offlineLogs = useOfflineStore((s) => s.offlineLogs);
  const offlineDeletions = useOfflineStore((s) => s.offlineDeletions);

  // Stale Warning Dialog state
  const [showStaleDialog, setShowStaleDialog] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [staleWarningHours, setStaleWarningHours] = useState(8);

  // Load stale warning from profile effective setting (via daily goal / session bootstrap)
  useEffect(() => {
    if (!ws) return;
    void api<{ effectiveTimerStaleWarningHours: number; jiraConnected?: boolean }>(
      ROUTES.USERS.ME,
      { workspaceId: ws }
    )
      .then((profile) => {
        const hours = profile.effectiveTimerStaleWarningHours;
        if (typeof hours === "number" && hours > 0) {
          setStaleWarningHours(hours);
        }
        setJiraConnected(profile.jiraConnected ?? false);
      })
      .catch(() => {});
  }, [ws]);

  const refreshRecentLogs = useCallback(async () => {
    await refetchRecentLogs();
  }, [refetchRecentLogs]);

  const fetchActiveTimer = useCallback(async () => {
    if (!ws) return;
    try {
      const res = await api<ActiveTimerDto | AutoStoppedTimerDto | null>(ROUTES.TIMER.ACTIVE, {
        workspaceId: ws
      });
      if (res && "autostopped" in res && res.autostopped) {
        setActive(null);
        toast.warning(formatAutoStopToastMessage(), { duration: 8000 });
        await commitTimelogMutation(ws, refreshRecentLogs);
        return;
      }
      setActive(res as ActiveTimerDto | null);
    } catch {
      // ignore
    }
  }, [ws, setActive, refreshRecentLogs]);

  useEffect(() => {
    if (!ws) return;
    void Promise.all([
      fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then((items) =>
        setProjects(ws, items)
      ),
      fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId: ws }).then((items) =>
        setTasks(ws, items)
      ),
      fetchActiveTimer()
    ]);
  }, [ws, setProjects, setTasks, fetchActiveTimer]);

  const reloadCatalog = useCallback(() => {
    if (!ws) return;
    void Promise.all([
      fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws, bypassCache: true }).then(
        (items) => setProjects(ws, items)
      ),
      fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId: ws, bypassCache: true }).then(
        (items) => setTasks(ws, items)
      )
    ]);
  }, [ws, setProjects, setTasks]);

  useRefetchOnWindowFocus(reloadCatalog, Boolean(ws));
  useWorkspaceStaleRefetch(ws, ["tasks", "projects"], reloadCatalog, Boolean(ws));
  useTimelogStaleRefetch(
    ws,
    () => {
      void refreshRecentLogs();
    },
    Boolean(ws)
  );

  // Handle active status ticks
  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  // Handle background polling of active timer state (every 30s)
  useEffect(() => {
    if (!ws) return;
    const intervalId = setInterval(fetchActiveTimer, 30000);
    return () => clearInterval(intervalId);
  }, [ws, fetchActiveTimer]);

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === projectId),
    [tasks, projectId]
  );

  const projectTasksByCategory = useMemo(() => {
    const groups = new Map<string, typeof projectTasks>();
    for (const t of projectTasks) {
      const key = t.categoryName ?? "Other";
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [projectTasks]);

  const activeTask = active ? tasks.find((t) => t.id === active.taskId) : null;
  const activeProject = activeTask ? projects.find((p) => p.id === activeTask.projectId) : null;
  const tracking = isActiveTimer(active);
  const isImpersonating = useIsImpersonating();

  // Stale check warning trigger
  useEffect(() => {
    if (!tracking || !active) return;
    const thresholdSec = staleWarningHours * 3600;
    if (elapsedSec < thresholdSec) return;
    if (snoozedUntil && Date.now() < snoozedUntil) return;
    setShowStaleDialog(true);
  }, [elapsedSec, tracking, staleWarningHours, snoozedUntil, active]);

  useEffect(() => {
    if (!ws || !tracking || activeTask) return;
    void fetchActiveTimer();
  }, [ws, tracking, activeTask, fetchActiveTimer]);

  const canStart = Boolean(projectId) && Boolean(taskChoice);

  function onProjectChange(id: string) {
    setProjectId(id);
    setTaskChoice("");
    setError(null);
  }

  async function startTimer() {
    if (isImpersonating || !canStart) return;
    setStarting(true);
    setError(null);

    const isOffline = useOfflineStore.getState().isOffline;
    if (isOffline) {
      const mockActive = {
        taskId: taskChoice,
        workspaceId: ws,
        userId: session?.user.id ?? "",
        elapsedSec: 0,
        startedAt: new Date().toISOString(),
        isPaused: false,
        pausedAt: null,
        accumulatedSec: 0,
        isOfflineActive: true
      };
      setActive(mockActive as unknown as Parameters<typeof setActive>[0]);
      setTaskChoice("");
      toast.success("Timer started successfully (offline)!");
      setStarting(false);
      return;
    }

    try {
      const res = await api<ActiveTimerDto>(ROUTES.TIMER.START, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ taskId: taskChoice })
      });
      setActive(res);
      setTaskChoice("");
      toast.success("Timer started successfully!");
      void refreshRecentLogs();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start timer";
      const errMsg = resolveTimerStartErrorMessage(message);
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setStarting(false);
    }
  }

  async function stopTimer() {
    if (isImpersonating) return;
    setStopping(true);
    setError(null);

    const isOffline = useOfflineStore.getState().isOffline;
    const isTempActive =
      active && (active as unknown as { isOfflineActive?: boolean }).isOfflineActive;
    if (isOffline || isTempActive) {
      const task = tasks.find((t) => t.id === active?.taskId);
      const projectId = task?.projectId;
      useOfflineStore.getState().addOfflineLog({
        taskId: active!.taskId,
        projectId,
        startTime: active!.startedAt,
        endTime: new Date().toISOString(),
        description: stopDescription.trim() || undefined,
        isBillable: activeTask?.billableDefault ?? true
      });
      const logged = formatElapsed(elapsedSec);
      setActive(null);
      setStopDescription("");
      toast.success(`Timer stopped. ${logged} saved locally.`);
      setStopping(false);
      return;
    }

    try {
      const created = await api<TimeLogDto>(ROUTES.TIMER.STOP, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          description: stopDescription.trim() || undefined,
          isBillable: activeTask?.billableDefault ?? true
        })
      });
      const logged = formatElapsed(elapsedSec);
      setActive(null);
      setStopDescription("");
      toast.success(`Timer stopped. ${logged} logged.`);
      await commitTimelogMutation(ws, refreshRecentLogs, { type: "upsert", log: created });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Something went wrong. Your time is safe — try again.";
      if (message.toLowerCase().includes("no active timer")) {
        setActive(null);
      }
      setError(message);
      toast.error(message);
    } finally {
      setStopping(false);
    }
  }

  async function pauseTimer() {
    if (isImpersonating) return;
    setPausing(true);
    setError(null);

    const isOffline = useOfflineStore.getState().isOffline;
    const isTempActive =
      active && (active as unknown as { isOfflineActive?: boolean }).isOfflineActive;
    if (isOffline || isTempActive) {
      setActive({
        ...active!,
        isPaused: true,
        pausedAt: new Date().toISOString()
      } as unknown as Parameters<typeof setActive>[0]);
      toast.success("Timer paused (offline).");
      setPausing(false);
      return;
    }

    try {
      await api(ROUTES.TIMER.PAUSE, {
        method: "POST",
        workspaceId: ws
      });
      await fetchActiveTimer();
      toast.success("Timer paused. Enjoy your break!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not pause timer");
    } finally {
      setPausing(false);
    }
  }

  async function resumeTimer() {
    if (isImpersonating) return;
    setResuming(true);
    setError(null);

    const isOffline = useOfflineStore.getState().isOffline;
    const isTempActive =
      active && (active as unknown as { isOfflineActive?: boolean }).isOfflineActive;
    if (isOffline || isTempActive) {
      const pausedMs = Date.now() - new Date(active!.pausedAt!).getTime();
      const newStart = new Date(new Date(active!.startedAt).getTime() + pausedMs).toISOString();
      setActive({
        ...active!,
        isPaused: false,
        pausedAt: null,
        startedAt: newStart
      } as unknown as Parameters<typeof setActive>[0]);
      toast.success("Timer resumed (offline).");
      setResuming(false);
      return;
    }

    try {
      await api(ROUTES.TIMER.RESUME, {
        method: "POST",
        workspaceId: ws
      });
      await fetchActiveTimer();
      toast.success("Timer resumed. Welcome back!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resume timer");
    } finally {
      setResuming(false);
    }
  }

  // Stale Warning Dialog actions
  const handleKeepRunning = () => {
    setShowStaleDialog(false);
    setSnoozedUntil(Date.now() + 60 * 60 * 1000); // Snooze for 1 hour
  };

  const handleStopAndSave = async () => {
    setShowStaleDialog(false);
    await stopTimer();
  };

  const handleDiscard = async () => {
    if (isImpersonating) return;
    setShowStaleDialog(false);

    const isOffline = useOfflineStore.getState().isOffline;
    const isTempActive =
      active && (active as unknown as { isOfflineActive?: boolean }).isOfflineActive;
    if (isOffline || isTempActive) {
      setActive(null);
      toast.info("Timer discarded (offline). No time was logged.");
      return;
    }

    try {
      await api(ROUTES.TIMER.DISCARD, { method: "POST", workspaceId: ws });
      setActive(null);
      toast.info("Timer discarded. No time was logged.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not discard timer");
    }
  };

  // ── Browser tab title ─────────────────────────────────────────────────────
  useEffect(() => {
    if (tracking) {
      document.title = `${isPaused ? "⏸️" : "⏱️"} ${formatElapsed(elapsedSec)} — ${BRAND_NAME}`;
    } else {
      document.title = BRAND_NAME;
    }
    return () => {
      document.title = BRAND_NAME;
    };
  }, [tracking, elapsedSec, isPaused]);

  // ── Keyboard shortcuts: Space / Ctrl+Shift+T → start/stop, Shift+Space → pause/resume ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
        return;

      const isSpaceBar = e.code === "Space" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
      const isPauseResume = e.code === "Space" && e.shiftKey && !e.ctrlKey && !e.metaKey;
      const isCtrlShiftT = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "t";

      if (isSpaceBar || isCtrlShiftT) {
        e.preventDefault();
        if (tracking) {
          void stopTimer();
        } else if (canStart) {
          void startTimer();
        }
      }

      if (isPauseResume && tracking) {
        e.preventDefault();
        if (isPaused) {
          void resumeTimer();
        } else {
          void pauseTimer();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking, isPaused, canStart, starting, stopping, pausing, resuming]);

  const displayedLogs = useMemo(() => {
    const activeServerLogs = recentLogs.filter((log) => !offlineDeletions.includes(log.id));
    const mappedOfflineLogs = offlineLogs.map((log) => ({
      id: log.tempId,
      userId: "",
      taskId: log.taskId,
      startTime: log.startTime,
      endTime: log.endTime,
      durationSec: Math.floor(
        (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000
      ),
      description: log.description || null,
      isBillable: log.isBillable ?? true,
      source: "timer" as const,
      isOffline: true,
      syncStatus: log.syncStatus
    }));
    return [...mappedOfflineLogs, ...activeServerLogs];
  }, [recentLogs, offlineLogs, offlineDeletions]);

  const todayLoggedSec = useMemo(() => {
    const today = todayInZone(timezone);
    const dateKey = toDateKeyInZone(today, timezone);
    return displayedLogs.reduce((sum, log) => {
      const start = new Date(log.startTime);
      if (toDateKeyInZone(start, timezone) !== dateKey) return sum;
      const end = new Date(log.endTime);
      return sum + (end.getTime() - start.getTime()) / 1000;
    }, 0);
  }, [displayedLogs, timezone]);

  const totalTodaySec = todayLoggedSec + (tracking ? elapsedSec : 0);

  return (
    <div className="space-y-6">
      <AppBar
        title="Timer"
        description={
          tracking
            ? "Manage your ongoing timer. Pausing allows taking breaks without breaking logs."
            : "Choose a project and task before you start tracking."
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Timer Column */}
        <div className="lg:col-span-7">
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle>{tracking ? "Tracking Time" : "Start Timer"}</CardTitle>
              {tracking && activeProject && activeTask && (
                <CardDescription className="flex items-center gap-2 mt-1">
                  <ProjectColorDot color={activeProject.color} size="md" />
                  <span className="font-medium text-foreground">
                    {formatTaskLabel(activeProject, activeTask.taskName, workspaceNamesById)}
                  </span>
                </CardDescription>
              )}
              {tracking && !activeTask && (
                <CardDescription className="text-amber-700 dark:text-amber-200">
                  Active timer on the server, but this task is not in your list. Stop to clear, or
                  refresh the page.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
              {/* Clock Ring */}
              <div className="flex justify-center py-6">
                <TimerRing
                  elapsedSec={elapsedSec}
                  active={tracking}
                  isPaused={isPaused}
                  size={180}
                />
              </div>

              {/* Status Hints / Action Buttons */}
              <div className="space-y-4">
                {!tracking && (
                  <p className="text-center text-xs text-muted-foreground">
                    Tip: Press{" "}
                    <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">
                      Space
                    </kbd>{" "}
                    or{" "}
                    <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">
                      Ctrl+Shift+T
                    </kbd>{" "}
                    to start
                  </p>
                )}
                {tracking && (
                  <p className="text-center text-xs text-muted-foreground">
                    Press{" "}
                    <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">
                      Space
                    </kbd>{" "}
                    to stop &bull;{" "}
                    <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">
                      Shift+Space
                    </kbd>{" "}
                    to pause/resume break
                  </p>
                )}

                {tracking ? (
                  <div className="space-y-4">
                    {isImpersonating ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Timer controls are disabled in view-only mode.
                      </p>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="stop-description">Note (optional)</Label>
                          <Input
                            id="stop-description"
                            value={stopDescription}
                            onChange={(e) => setStopDescription(e.target.value)}
                            placeholder="What did you work on?"
                          />
                          <JiraIssuePicker
                            issues={jiraIssues}
                            onSelect={(value) => setStopDescription(value)}
                          />
                        </div>
                        {/* Actions Row */}
                        <div className="grid grid-cols-2 gap-3">
                          {isPaused ? (
                            <Button
                              onClick={resumeTimer}
                              disabled={resuming || stopping}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Play className="size-4 mr-1.5" />
                              {resuming ? "Resuming…" : "Resume"}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={pauseTimer}
                              disabled={pausing || stopping}
                              className="w-full border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                            >
                              <Pause className="size-4 mr-1.5" />
                              {pausing ? "Pausing…" : "Pause break"}
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={stopTimer}
                            disabled={stopping || pausing || resuming}
                          >
                            <Square className="size-4 mr-1.5 fill-current" />
                            {stopping ? "Stopping…" : "Stop & save"}
                          </Button>
                        </div>

                        {/* Paused state banner */}
                        {isPaused && (
                          <p className="text-center text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg py-2 px-3">
                            ⏸ Timer is paused. Resume when you&apos;re back, or stop to save.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.length === 0 ? (
                      <EmptyState
                        title="No projects assigned"
                        description="You are not on any projects yet. Ask your admin to add you to a project."
                      />
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>Project</Label>
                          <SearchableSelect
                            value={projectId}
                            onValueChange={onProjectChange}
                            options={projects.map((p) => ({
                              value: p.id,
                              label: formatProjectLabel(p, workspaceNamesById)
                            }))}
                            placeholder="Select project"
                            searchPlaceholder="Search projects…"
                            renderOption={(option) => (
                              <span className="flex items-center gap-2">
                                <ProjectColorDot
                                  color={
                                    projects.find((p) => p.id === option.value)?.color ?? "#236bfe"
                                  }
                                />
                                {option.label}
                              </span>
                            )}
                            renderValue={(option) =>
                              option ? (
                                <span className="flex items-center gap-2">
                                  <ProjectColorDot
                                    color={
                                      projects.find((p) => p.id === option.value)?.color ??
                                      "#236bfe"
                                    }
                                  />
                                  {option.label}
                                </span>
                              ) : (
                                "Select project"
                              )
                            }
                            aria-label="Project"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Task</Label>
                          <SearchableSelect
                            value={taskChoice}
                            onValueChange={(v) => {
                              setTaskChoice(v);
                              setError(null);
                            }}
                            groups={projectTasksByCategory.map(([categoryName, list]) => ({
                              label: categoryName,
                              options: list.map((t) => ({ value: t.id, label: t.taskName }))
                            }))}
                            placeholder={
                              !projectId
                                ? "Select a project first"
                                : projectTasks.length === 0
                                  ? "No tasks for this project"
                                  : "Select a task"
                            }
                            searchPlaceholder="Search tasks…"
                            disabled={!projectId || projectTasks.length === 0}
                            aria-label="Task"
                          />
                          {projectId && projectTasks.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              Ask your admin to assign you to tasks on this project.
                            </p>
                          )}
                        </div>

                        {!isImpersonating && (
                          <Button
                            className="w-full"
                            onClick={startTimer}
                            disabled={!canStart || starting}
                          >
                            {starting ? "Starting…" : "Start timer"}
                          </Button>
                        )}
                        {isImpersonating && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Timer controls are disabled in view-only mode.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Widgets Column */}
        <div className="lg:col-span-5 space-y-6">
          <DailyGoalWidget totalSeconds={totalTodaySec} logs={displayedLogs} timezone={timezone} />

          <QuickActions
            onSelect={(pId, tId) => {
              setProjectId(pId);
              setTaskChoice(tId);
            }}
            currentProjectId={projectId}
            currentTaskId={taskChoice}
          />
        </div>
      </div>

      <StaleTimerDialog
        open={showStaleDialog}
        elapsedHours={elapsedSec / 3600}
        thresholdHours={staleWarningHours}
        onKeepRunning={handleKeepRunning}
        onStopAndSave={handleStopAndSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
