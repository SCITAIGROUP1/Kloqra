"use client";

import { ROUTES } from "@chronomint/contracts";
import type { CategoryDto } from "@chronomint/contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@chronomint/ui";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

export function AdminCategoriesPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!ws) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws]);

  async function refresh() {
    const list = await api<CategoryDto[]>(ROUTES.CATEGORIES.LIST, { workspaceId: ws });
    setCategories(list);
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api(ROUTES.CATEGORIES.CREATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined
        })
      });
      setName("");
      setDescription("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create category.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(category: CategoryDto) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description ?? "");
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  }

  async function saveEdit(category: CategoryDto) {
    if (!editingId) return;
    setBusyId(category.id);
    setError(null);
    try {
      await api(ROUTES.CATEGORIES.BY_ID(category.id), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() === "" ? null : editDescription.trim()
        })
      });
      cancelEdit();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update category.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeCategory(category: CategoryDto) {
    const blocker =
      category.taskCount && category.taskCount > 0
        ? `Move or delete the ${category.taskCount} task${category.taskCount === 1 ? "" : "s"} in this category first.`
        : null;
    if (blocker) {
      setError(blocker);
      return;
    }
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    setBusyId(category.id);
    setError(null);
    try {
      await api(ROUTES.CATEGORIES.BY_ID(category.id), {
        method: "DELETE",
        workspaceId: ws
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete category.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Categories</h2>
        <p className="text-sm text-muted-foreground">
          Workspace-wide buckets for tasks (e.g. Software Development, UI/UX Design, Meetings). Each
          task on every project must belong to one category.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>New category</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createCategory} className="flex flex-wrap items-end gap-x-6 gap-y-5">
            <div className="min-w-[220px] flex-1 space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Software Development"
                maxLength={120}
                required
              />
            </div>
            <div className="min-w-[260px] flex-[2] space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Input
                id="category-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional — what this bucket covers"
                maxLength={500}
              />
            </div>
            <Button type="submit" disabled={saving || !name.trim()} className="gap-2">
              <Plus className="h-4 w-4" aria-hidden />
              Create
            </Button>
          </form>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>All categories</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No categories yet. Create your first one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[110px] text-right">Tasks</TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => {
                  const isEditing = editingId === c.id;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={120}
                          />
                        ) : (
                          <span className="font-medium">{c.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            maxLength={500}
                            placeholder="Optional"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {c.description ?? "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{c.taskCount ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              disabled={busyId === c.id}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveEdit(c)}
                              disabled={busyId === c.id || !editName.trim()}
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(c)}
                              className="gap-1"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeCategory(c)}
                              disabled={busyId === c.id}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
