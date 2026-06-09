"use client";

import { ROUTES } from "@chronomint/contracts";
import type { CategoryDto, TaskDto } from "@chronomint/contracts";
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@chronomint/ui";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editBillable, setEditBillable] = useState(true);
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

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [taskList, categoryList] = await Promise.all([
        api<TaskDto[]>(`${ROUTES.TASKS.LIST}?projectId=${projectId}`, { workspaceId }),
        api<CategoryDto[]>(ROUTES.CATEGORIES.LIST, { workspaceId })
      ]);
      setTasks(taskList);
      setCategories(categoryList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newCategoryId) return;
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
          billableDefault: newBillable
        })
      });
      setNewName("");
      setNewBillable(true);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(task: TaskDto) {
    setEditingId(task.id);
    setEditName(task.taskName);
    setEditCategoryId(task.categoryId);
    setEditBillable(task.billableDefault);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditCategoryId("");
    setEditBillable(true);
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
          billableDefault: editBillable
        })
      });
      cancelEdit();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeTask(task: TaskDto) {
    if (!window.confirm(`Delete task "${task.taskName}"? Existing time logs will be removed.`)) {
      return;
    }
    setBusyId(task.id);
    setError(null);
    try {
      await api(ROUTES.TASKS.BY_ID(task.id), { method: "DELETE", workspaceId });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task.");
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
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories yet. Create at least one category before adding tasks.
        </p>
      ) : (
        <form onSubmit={createTask} className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
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
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger id="new-task-category">
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
            size="sm"
            disabled={saving || !newName.trim() || !newCategoryId}
            className="gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add task
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tasks yet. Add one above so members can log time.
        </p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([categoryName, list]) => (
            <div key={categoryName} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{categoryName}</Badge>
                <span className="text-xs text-muted-foreground">
                  {list.length} task{list.length === 1 ? "" : "s"}
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead className="w-[180px]">Category</TableHead>
                    <TableHead className="w-[120px]">Billable</TableHead>
                    <TableHead className="w-[180px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((t) => {
                    const isEditing = editingId === t.id;
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              maxLength={200}
                            />
                          ) : (
                            <span className="font-medium">{t.taskName}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {t.categoryName ?? categoryById.get(t.categoryId)?.name ?? "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="size-4 rounded border border-input accent-primary"
                                checked={editBillable}
                                onChange={(e) => setEditBillable(e.target.checked)}
                              />
                              <span>Billable</span>
                            </label>
                          ) : (
                            <Badge variant={t.billableDefault ? "default" : "secondary"}>
                              {t.billableDefault ? "Billable" : "Non-billable"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                disabled={busyId === t.id}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveEdit(t)}
                                disabled={busyId === t.id || !editName.trim() || !editCategoryId}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(t)}
                                className="gap-1"
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeTask(t)}
                                disabled={busyId === t.id}
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                Delete
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
