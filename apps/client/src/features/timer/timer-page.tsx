"use client";

import { ROUTES } from "@chronomint/contracts";
import type {
  ActiveTimerDto,
  TaskDto,
  ProjectDto,
  ListTimeLogsResponseDto,
  AutoStoppedTimerDto
} from "@chronomint/contracts";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ProjectColorDot,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  EmptyState
} from "@chronomint/ui";
import { Play, Pause, Square } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { DailyGoalWidget } from "./daily-goal-widget";
import { QuickActions } from "./quick-actions";
import { StaleTimerDialog } from "./stale-timer-dialog";
import { OnboardingOverlay } from "@/features/onboarding/onboarding-overlay";
import { suggestBillableFromTask } from "@/features/timesheet/time-entry-dialog";
import { api } from "@/lib/api";
import { formatProjectLabel, formatTaskLabel } from "@/lib/project-labels";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { isActiveTimer, useTimerStore } from "@/stores/timer.store";

const HARD_AUTO_STOP_HOURS = 14;

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

  const [projectId, setProjectId] = useState("");
  const [taskChoice, setTaskChoice] = useState("");
  const [stopDescription, setStopDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [todayLogs, setTodayLogs] = useState<any[]>([]);

  // Stale Warning Dialog state
  const [showStaleDialog, setShowStaleDialog] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [staleWarningHours, setStaleWarningHours] = useState(8);

  // Load stale warning settings
  useEffect(() => {
    if (!ws) return;
    api<any[]>(ROUTES.WORKSPACES.LIST, { workspaceId: ws })
      .then((list) => {
        const current = list.find((w) => w.id === ws);
        const hours = current?.settings?.timerStaleWarningHours;
        if (typeof hours === "number" && hours > 0) {
          setStaleWarningHours(hours);
        }
      })
      .catch(() => {});
  }, [ws]);

  const fetchTodayLogs = useCallback(async () => {
    if (!ws) return;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({
        from: todayStart.toISOString(),
        to: todayEnd.toISOString()
      });
      const res = await api<ListTimeLogsResponseDto>(`${ROUTES.TIMELOGS.LIST}?${params}`, {
        workspaceId: ws
      });
      setTodayLogs(res.items || []);
    } catch {
      // ignore
    }
  }, [ws]);

  const fetchActiveTimer = useCallback(async () => {
    if (!ws) return;
    try {
      const res = await api<ActiveTimerDto | AutoStoppedTimerDto | null>(ROUTES.TIMER.ACTIVE, {
        workspaceId: ws
      });
      if (res && "autostopped" in res && res.autostopped) {
        setActive(null);
        toast.warning(
          `Your timer was automatically stopped after ${HARD_AUTO_STOP_HOURS} hours. A time entry was saved on your behalf.`,
          { duration: 8000 }
        );
        void fetchTodayLogs();
        return;
      }
      setActive(res as ActiveTimerDto | null);
    } catch {
      // ignore
    }
  }, [ws, setActive, fetchTodayLogs]);

  useEffect(() => {
    if (!ws) return;
    void Promise.all([
      api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects),
      api<TaskDto[]>(ROUTES.TASKS.LIST, { workspaceId: ws }).then(setTasks),
      fetchActiveTimer(),
      fetchTodayLogs()
    ]);
  }, [ws, setProjects, setTasks, fetchActiveTimer, fetchTodayLogs]);

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
    setIsBillable(true);
    setError(null);
  }

  useEffect(() => {
    if (activeTask) {
      setIsBillable(activeTask.billableDefault);
    }
  }, [activeTask]);

  async function startTimer() {
    if (!canStart) return;
    setStarting(true);
    setError(null);
    try {
      const res = await api<ActiveTimerDto>(ROUTES.TIMER.START, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ taskId: taskChoice })
      });
      setActive(res);
      setTaskChoice("");
      toast.success("Timer started successfully!");
      void fetchTodayLogs();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start timer";
      if (message.toLowerCase().includes("timer already running")) {
        const errMsg = "A timer is already running in this workspace. Stop it first.";
        setError(errMsg);
        toast.error(errMsg);
      } else {
        setError(message);
        toast.error(message);
      }
    } finally {
      setStarting(false);
    }
  }

  async function stopTimer() {
    setStopping(true);
    setError(null);
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
      void fetchTodayLogs();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not stop timer";
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
    setPausing(true);
    setError(null);
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
    setResuming(true);
    setError(null);
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
    setShowStaleDialog(false);
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
      document.title = `${isPaused ? "⏸️" : "⏱️"} ${formatElapsed(elapsedSec)} — ChronoMint`;
    } else {
      document.title = "ChronoMint";
    }
    return () => {
      document.title = "ChronoMint";
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

  const todayLoggedSec = useMemo(() => {
    return todayLogs.reduce((sum, log) => {
      const start = new Date(log.startTime);
      const end = new Date(log.endTime);
      return sum + (end.getTime() - start.getTime()) / 1000;
    }, 0);
  }, [todayLogs]);

  const totalTodaySec = todayLoggedSec + (tracking ? elapsedSec : 0);

  return (
    <div className="mx-auto max-w-6xl px-4 space-y-6">
      <OnboardingOverlay />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Timer</h1>
        <p className="text-sm text-muted-foreground">
          {tracking
            ? "Manage your ongoing timer. Pausing allows taking breaks without breaking logs."
            : "Choose a project and task before you start tracking."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Timer Column */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col">
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
                    <div className="space-y-2">
                      <Label htmlFor="stop-description">Note (optional)</Label>
                      <Input
                        id="stop-description"
                        value={stopDescription}
                        onChange={(e) => setStopDescription(e.target.value)}
                        placeholder="What did you work on?"
                      />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border border-input accent-primary"
                        checked={isBillable}
                        onChange={(e) => setIsBillable(e.target.checked)}
                      />
                      <span>Billable time</span>
                    </label>

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
                          <Select value={projectId} onValueChange={onProjectChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  <span className="flex items-center gap-2">
                                    <ProjectColorDot color={p.color} />
                                    {formatProjectLabel(p, workspaceNamesById)}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Task</Label>
                          <Select
                            value={taskChoice}
                            onValueChange={(v) => {
                              setTaskChoice(v);
                              setError(null);
                              setIsBillable(suggestBillableFromTask(tasks, v));
                            }}
                            disabled={!projectId || projectTasks.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  !projectId
                                    ? "Select a project first"
                                    : projectTasks.length === 0
                                      ? "No tasks for this project"
                                      : "Select a task"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {projectTasksByCategory.map(([categoryName, list]) => (
                                <div key={categoryName}>
                                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {categoryName}
                                  </div>
                                  {list.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.taskName}
                                    </SelectItem>
                                  ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>
                          {projectId && projectTasks.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              No tasks yet on this project. Ask your admin to add tasks before you
                              can log time.
                            </p>
                          )}
                        </div>

                        <Button
                          className="w-full"
                          onClick={startTimer}
                          disabled={!canStart || starting}
                        >
                          {starting ? "Starting…" : "Start timer"}
                        </Button>
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
          <DailyGoalWidget totalSeconds={totalTodaySec} />

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
