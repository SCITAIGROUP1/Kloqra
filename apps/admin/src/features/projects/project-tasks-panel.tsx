"use client";

import { ROUTES } from "@kloqra/contracts";
import type { CategoryDto, TaskDto } from "@kloqra/contracts";
import {
  Badge,
  Button,
  Input,
  Label,
  SearchableSelect,
  AssigneeAvatarStack,
  TaskAssigneePicker,
  cn,
  CenteredLoader
} from "@kloqra/ui";
import { SettingsCard, fetchListItems, fetchProjectTeam } from "@kloqra/web-shared";
import { ListTodo, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getDeleteTaskConfirmationMessage } from "./delete-task-confirmation";
import { api } from "@/lib/api";

type Props = {
  workspaceId: string;
  projectId: string;
};

export function ProjectTasksPanel({ workspaceId, projectId }: Props) {
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<string>("");
  const [newBillable, setNewBillable] = useState(true);
  const [newIsCommon, setNewIsCommon] = useState(true);
  const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<
    { userId: string; userName: string; email?: string; isActive: boolean }[]
  >([]);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editBillable, setEditBillable] = useState(true);
  const [editIsCommon, setEditIsCommon] = useState(true);
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const categoryById = useMemo(() => {
    const m = new Map<string, CategoryDto>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, projectId]);

  useEffect(() => {
    if (!newCategoryId && categories.length > 0) {
      setNewCategoryId(categories[0]!.id);
    }
  }, [categories, newCategoryId]);

  const activeTeamOptions = useMemo(
    () =>
      teamMembers
        .filter((m) => m.isActive)
        .map((m) => ({ userId: m.userId, userName: m.userName, email: m.email })),
    [teamMembers]
  );

  const unassignedCount = useMemo(
    () => tasks.filter((t) => !t.isCommon && t.assignees.length === 0).length,
    [tasks]
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [taskList, categoryList, team] = await Promise.all([
        fetchListItems<TaskDto>(ROUTES.TASKS.LIST, {
          workspaceId,
          filters: { projectId },
          bypassCache: true
        }),
        fetchListItems<CategoryDto>(ROUTES.CATEGORIES.LIST, { workspaceId }),
        fetchProjectTeam(projectId, { workspaceId })
      ]);
      setTasks(taskList);
      setCategories(categoryList);
      setTeamMembers(
        team.members.map((m) => ({
          userId: m.userId,
          userName: m.userName,
          email: m.userEmail,
          isActive: m.isActive
        }))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load tasks.";
      setError(
        message.includes("Too Many Requests")
          ? "The server is rate-limiting requests. Wait a moment and refresh the page."
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newCategoryId || (!newIsCommon && newAssigneeIds.length === 0)) return;
    setSaving(true);
    setError(null);
    try {
      await api(ROUTES.TASKS.CREATE, {
        method: "POST",
        workspaceId,
        body: JSON.stringify({
          projectId,
          categoryId: newCategoryId,
          taskName: newName.trim(),
          billableDefault: newBillable,
          isCommon: newIsCommon,
          assigneeUserIds: newIsCommon ? [] : newAssigneeIds
        })
      });
      setNewName("");
      setNewBillable(true);
      setNewIsCommon(true);
      setNewAssigneeIds([]);
      toast.success("Task created.");
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create task.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(task: TaskDto) {
    setEditingId(task.id);
    setEditName(task.taskName);
    setEditCategoryId(task.categoryId);
    setEditBillable(task.billableDefault);
    setEditIsCommon(task.isCommon);
    setEditAssigneeIds(task.assignees.map((a) => a.userId));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditCategoryId("");
    setEditBillable(true);
    setEditIsCommon(true);
    setEditAssigneeIds([]);
  }

  async function saveEdit(task: TaskDto) {
    if (!editingId) return;
    setBusyId(task.id);
    setError(null);
    try {
      await api(ROUTES.TASKS.BY_ID(task.id), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({
          taskName: editName.trim(),
          categoryId: editCategoryId,
          billableDefault: editBillable,
          isCommon: editIsCommon,
          assigneeUserIds: editIsCommon ? [] : editAssigneeIds
        })
      });
      cancelEdit();
      toast.success("Task updated.");
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update task.";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeTask(task: TaskDto) {
    if (!window.confirm(getDeleteTaskConfirmationMessage(task.taskName))) {
      return;
    }
    setBusyId(task.id);
    setError(null);
    try {
      await api(ROUTES.TASKS.BY_ID(task.id), { method: "DELETE", workspaceId });
      toast.success(`"${task.taskName}" deleted.`);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not delete task.";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  const grouped = useMemo(() => {
    const groups = new Map<string, TaskDto[]>();
    for (const t of tasks) {
      const key = t.categoryName ?? categoryById.get(t.categoryId)?.name ?? "Uncategorized";
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tasks, categoryById]);

  return (
    <div className="space-y-4">
      {unassignedCount > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          {unassignedCount} task{unassignedCount === 1 ? "" : "s"} have no assignees and are hidden
          from members.
        </div>
      ) : null}

      {categories.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
          No categories yet. Create at least one category before adding tasks.
        </div>
      ) : (
        <SettingsCard
          icon={Plus}
          title="Add task"
          description="Members pick from this list when logging time on the project."
        >
          <form onSubmit={createTask} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-task-name">Task name</Label>
                <Input
                  id="new-task-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Frontend development"
                  maxLength={200}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-task-category">Category</Label>
                <SearchableSelect
                  id="new-task-category"
                  value={newCategoryId}
                  onValueChange={setNewCategoryId}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Choose category"
                  searchPlaceholder="Search categories…"
                  aria-label="Category"
                />
              </div>
            </div>
            <div className="space-y-2.5">
              <Label>Task Assignment Type</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setNewIsCommon(true)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all hover:bg-muted/50",
                    newIsCommon
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-transparent"
                  )}
                >
                  <span className="text-sm font-semibold">Common task</span>
                  <span className="text-xs text-muted-foreground">
                    Available to all project team members by default
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewIsCommon(false)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all hover:bg-muted/50",
                    !newIsCommon
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-transparent"
                  )}
                >
                  <span className="text-sm font-semibold">Assigned task</span>
                  <span className="text-xs text-muted-foreground">
                    Restrict visibility to specific team members
                  </span>
                </button>
              </div>
            </div>
            {!newIsCommon && (
              <div className="space-y-2">
                <Label>Assignees</Label>
                <TaskAssigneePicker
                  members={activeTeamOptions}
                  value={newAssigneeIds}
                  onChange={setNewAssigneeIds}
                  disabled={saving}
                />
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border border-input accent-primary"
                  checked={newBillable}
                  onChange={(e) => setNewBillable(e.target.checked)}
                />
                <span>Billable by default</span>
              </label>
              <Button
                type="submit"
                disabled={
                  saving ||
                  !newName.trim() ||
                  !newCategoryId ||
                  (!newIsCommon && newAssigneeIds.length === 0)
                }
                className="gap-2 sm:w-auto"
              >
                <Plus className="size-4" aria-hidden />
                Add task
              </Button>
            </div>
          </form>
        </SettingsCard>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <SettingsCard
        icon={ListTodo}
        title="Task list"
        description={
          loading
            ? "Loading tasks…"
            : tasks.length === 0
              ? "No tasks yet — add one above."
              : `${tasks.length} task${tasks.length === 1 ? "" : "s"} across ${grouped.length} ${grouped.length === 1 ? "category" : "categories"}`
        }
      >
        {loading && tasks.length === 0 ? (
          <CenteredLoader label="Loading tasks…" className="py-8" />
        ) : tasks.length === 0 ? null : (
          <div className="space-y-5">
            {grouped.map(([categoryName, list]) => (
              <div key={categoryName} className="space-y-2">
                <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {categoryName}
                  <span className="ml-2 font-normal normal-case tracking-normal">
                    · {list.length} task{list.length === 1 ? "" : "s"}
                  </span>
                </p>
                <ul className="space-y-2">
                  {list.map((task) => {
                    const isEditing = editingId === task.id;
                    return (
                      <li
                        key={task.id}
                        className={cn(
                          "rounded-lg border border-border/80 bg-muted/10 px-4 py-3 transition-colors",
                          isEditing && "border-primary/30 bg-primary/5"
                        )}
                      >
                        {isEditing ? (
                          <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor={`edit-name-${task.id}`}>Task name</Label>
                                <Input
                                  id={`edit-name-${task.id}`}
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  maxLength={200}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`edit-category-${task.id}`}>Category</Label>
                                <SearchableSelect
                                  id={`edit-category-${task.id}`}
                                  value={editCategoryId}
                                  onValueChange={setEditCategoryId}
                                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                                  placeholder="Category"
                                  searchPlaceholder="Search categories…"
                                  aria-label="Category"
                                />
                              </div>
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 text-sm py-1">
                              <input
                                type="checkbox"
                                className="size-4 rounded border border-input accent-primary"
                                checked={editBillable}
                                onChange={(e) => setEditBillable(e.target.checked)}
                              />
                              <span>Billable by default</span>
                            </label>
                            <div className="space-y-2">
                              <Label>Task Assignment Type</Label>
                              <div className="grid gap-2.5 sm:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() => setEditIsCommon(true)}
                                  className={cn(
                                    "flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-all hover:bg-muted/50",
                                    editIsCommon
                                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                                      : "border-border bg-background"
                                  )}
                                >
                                  <span className="text-xs font-semibold">Common task</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    All project members can access
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditIsCommon(false)}
                                  className={cn(
                                    "flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-all hover:bg-muted/50",
                                    !editIsCommon
                                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                                      : "border-border bg-background"
                                  )}
                                >
                                  <span className="text-xs font-semibold">Assigned task</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    Restrict to specific assignees
                                  </span>
                                </button>
                              </div>
                            </div>
                            {!editIsCommon && (
                              <div className="space-y-2">
                                <Label>Assignees</Label>
                                <TaskAssigneePicker
                                  members={activeTeamOptions}
                                  value={editAssigneeIds}
                                  onChange={setEditAssigneeIds}
                                  disabled={busyId === task.id}
                                />
                              </div>
                            )}
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                disabled={busyId === task.id}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void saveEdit(task)}
                                disabled={
                                  busyId === task.id ||
                                  !editName.trim() ||
                                  !editCategoryId ||
                                  (!editIsCommon && editAssigneeIds.length === 0)
                                }
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{task.taskName}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {task.categoryName ??
                                  categoryById.get(task.categoryId)?.name ??
                                  "Uncategorized"}
                              </p>
                              {task.isCommon ? (
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  Common task (all members)
                                </p>
                              ) : task.assignees.length > 0 ? (
                                <div className="mt-2">
                                  <AssigneeAvatarStack
                                    members={task.assignees.map((a) => ({
                                      userId: a.userId,
                                      userName: a.userName
                                    }))}
                                  />
                                </div>
                              ) : (
                                <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
                                  No assignees
                                </p>
                              )}
                            </div>
                            <Badge variant={task.billableDefault ? "default" : "secondary"}>
                              {task.billableDefault ? "Billable" : "Non-billable"}
                            </Badge>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                onClick={() => startEdit(task)}
                                aria-label={`Edit ${task.taskName}`}
                              >
                                <Pencil className="size-4" aria-hidden />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-8 text-destructive hover:text-destructive"
                                onClick={() => void removeTask(task)}
                                disabled={busyId === task.id}
                                aria-label={`Delete ${task.taskName}`}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>
    </div>
  );
}
