"use client";

import { ROUTES } from "@chronomint/contracts";
import type { ActiveTimerDto, TaskDto, ProjectDto } from "@chronomint/contracts";
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
  SelectValue
} from "@chronomint/ui";
import { useEffect, useMemo, useState } from "react";
import { suggestBillableFromTask } from "@/features/timesheet/time-entry-dialog";
import { api } from "@/lib/api";
import { formatProjectLabel, formatTaskLabel } from "@/lib/project-labels";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { isActiveTimer, useTimerStore } from "@/stores/timer.store";

const NEW_TASK = "__new__";

function formatElapsed(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "00:00:00";
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function TimerPage() {
  const session = useSessionStore((s) => s.session);
  const { active, elapsedSec, setActive, tick } = useTimerStore();
  const { tasks, projects, workspaceNamesById, setTasks, setProjects } = useProjectsStore();
  const ws = session?.workspaceId ?? getWorkspaceId() ?? "";

  const [projectId, setProjectId] = useState("");
  const [taskChoice, setTaskChoice] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [stopDescription, setStopDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ws) return;
    void Promise.all([
      api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects),
      api<TaskDto[]>(ROUTES.TASKS.LIST, { workspaceId: ws }).then(setTasks),
      api<ActiveTimerDto | null>(ROUTES.TIMER.ACTIVE, { workspaceId: ws }).then(setActive)
    ]);
  }, [ws, setProjects, setTasks, setActive]);

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === projectId),
    [tasks, projectId]
  );

  const activeTask = active ? tasks.find((t) => t.id === active.taskId) : null;
  const activeProject = activeTask ? projects.find((p) => p.id === activeTask.projectId) : null;
  const tracking = isActiveTimer(active);

  useEffect(() => {
    if (!ws || !tracking || activeTask) return;
    api<ActiveTimerDto | null>(ROUTES.TIMER.ACTIVE, { workspaceId: ws }).then(setActive);
  }, [ws, tracking, activeTask, setActive]);

  const canStart =
    Boolean(projectId) &&
    (taskChoice === NEW_TASK ? newTaskName.trim().length > 0 : Boolean(taskChoice));

  function onProjectChange(id: string) {
    setProjectId(id);
    setTaskChoice("");
    setNewTaskName("");
    setIsBillable(true);
    setError(null);
  }

  useEffect(() => {
    if (activeTask) {
      setIsBillable(activeTask.billableDefault);
    }
  }, [activeTask?.id, activeTask?.billableDefault]);

  async function resolveTaskId(): Promise<string> {
    if (taskChoice !== NEW_TASK) return taskChoice;
    const created = await api<TaskDto>(ROUTES.TASKS.CREATE, {
      method: "POST",
      workspaceId: ws,
      body: JSON.stringify({ projectId, taskName: newTaskName.trim() })
    });
    const all = await api<TaskDto[]>(ROUTES.TASKS.LIST, { workspaceId: ws });
    setTasks(all);
    return created.id;
  }

  async function startTimer() {
    if (!canStart) return;
    setStarting(true);
    setError(null);
    try {
      const taskId = await resolveTaskId();
      const res = await api<ActiveTimerDto>(ROUTES.TIMER.START, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ taskId })
      });
      setActive(res);
      setTaskChoice("");
      setNewTaskName("");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start timer";
      if (message.toLowerCase().includes("timer already running")) {
        setError(
          "A timer is already running in this workspace. Stop it on this device or another device, then try again."
        );
      } else {
        setError(message);
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
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not stop timer";
      if (message.toLowerCase().includes("no active timer")) {
        setActive(null);
      }
      setError(message);
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timer</h1>
        <p className="text-sm text-muted-foreground">
          {tracking
            ? "Stop the timer when you are done. The clock updates every second."
            : "Choose a project and task before you start tracking."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tracking ? "Tracking time" : "Start timer"}</CardTitle>
          {tracking && activeProject && activeTask && (
            <CardDescription className="flex items-center gap-2">
              <ProjectColorDot color={activeProject.color} size="md" />
              {formatTaskLabel(activeProject, activeTask.taskName, workspaceNamesById)}
            </CardDescription>
          )}
          {tracking && !activeTask && (
            <CardDescription className="text-amber-700 dark:text-amber-200">
              Active timer on the server, but this task is not in your list. Stop to clear, or
              refresh the page.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="font-mono text-5xl tabular-nums tracking-tight">
            {formatElapsed(elapsedSec)}
          </p>

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
              <Button
                variant="destructive"
                className="w-full"
                onClick={stopTimer}
                disabled={stopping}
              >
                {stopping ? "Stopping…" : "Stop timer"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You are not on any projects yet. Ask your admin to add you to a project.
                </p>
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
                        if (v !== NEW_TASK) setNewTaskName("");
                        setIsBillable(suggestBillableFromTask(tasks, v));
                      }}
                      disabled={!projectId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            projectId ? "Select or create a task" : "Select a project first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {projectTasks.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.taskName}
                          </SelectItem>
                        ))}
                        <SelectItem value={NEW_TASK}>+ Create new task…</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {taskChoice === NEW_TASK && (
                    <div className="space-y-2">
                      <Label htmlFor="new-task-name">New task name</Label>
                      <Input
                        id="new-task-name"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        placeholder="e.g. Frontend development"
                        required
                      />
                    </div>
                  )}

                  <Button className="w-full" onClick={startTimer} disabled={!canStart || starting}>
                    {starting ? "Starting…" : "Start timer"}
                  </Button>
                </>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
