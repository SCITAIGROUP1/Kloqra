"use client";

import { ROUTES } from "@kloqra/contracts";
import type { CategoryDto } from "@kloqra/contracts";
import {
  AppBar,
  Badge,
  Button,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Input,
  Label,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow,
  TableToolbar,
  TableLoadingState
} from "@kloqra/ui";
import { usePaginatedList } from "@kloqra/web-shared";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

export function AdminCategoriesPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const {
    items: categories,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit,
    loading,
    reload
  } = usePaginatedList<CategoryDto>({
    workspaceId: ws,
    basePath: ROUTES.CATEGORIES.LIST
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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
      toast.success("Category created.");
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create category.";
      setError(message);
      toast.error(message);
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
      toast.success("Category updated.");
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update category.";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeCategory(category: CategoryDto) {
    setBusyId(category.id);
    setError(null);
    try {
      await api(ROUTES.CATEGORIES.BY_ID(category.id), {
        method: "DELETE",
        workspaceId: ws
      });
      toast.success(`"${category.name}" deleted.`);
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not delete category.";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Categories"
        description="Organize tasks into categories. Each task belongs to one category."
      />

      <form
        onSubmit={createCategory}
        className="grid gap-4 rounded-xl border border-primary/10 bg-card p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className="space-y-2">
          <Label htmlFor="category-name">Name</Label>
          <Input
            id="category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Development"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category-description">Description</Label>
          <Input
            id="category-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <Button type="submit" disabled={saving} className="gap-2">
          <Plus className="size-4" aria-hidden />
          Add category
        </Button>
      </form>

      <DataTableCard>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search categories…"
          searchAriaLabel="Search categories"
        />
        {loading ? (
          <TableLoadingState rows={6} columns={4} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Name</DataTableHead>
                  <DataTableHead>Description</DataTableHead>
                  <DataTableHead>Tasks</DataTableHead>
                  <DataTableHead className="text-right">Actions</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const isEditing = editingId === category.id;
                  return (
                    <TableRow key={category.id}>
                      <DataTableCell>
                        {isEditing ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            aria-label="Edit category name"
                          />
                        ) : (
                          <span className="font-medium">{category.name}</span>
                        )}
                      </DataTableCell>
                      <DataTableCell className="text-muted-foreground">
                        {isEditing ? (
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            aria-label="Edit category description"
                          />
                        ) : (
                          (category.description ?? "—")
                        )}
                      </DataTableCell>
                      <DataTableCell>
                        <Badge variant="secondary">{category.taskCount ?? 0}</Badge>
                      </DataTableCell>
                      <DataTableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={busyId === category.id}
                                onClick={() => void saveEdit(category)}
                              >
                                Save
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => startEdit(category)}
                                aria-label={`Edit ${category.name}`}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={busyId === category.id}
                                onClick={() => void removeCategory(category)}
                                aria-label={`Delete ${category.name}`}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </DataTableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              disabled={loading}
            />
          </>
        )}
      </DataTableCard>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
