"use client";

import { ROUTES } from "@kloqra/contracts";
import type { CategoryDto } from "@kloqra/contracts";
import {
  AppBar,
  AppBarListToolbar,
  AppModal,
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
  TableLoadingState
} from "@kloqra/ui";
import { apiDownloadGet, saveDownloadResponse, usePaginatedList } from "@kloqra/web-shared";
import { Download, FileSpreadsheet, Pencil, Plus, Trash2, Upload } from "lucide-react";
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
    setLimit,
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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  async function handleDownloadTemplate() {
    try {
      const res = await apiDownloadGet(ROUTES.CATEGORIES.BULK_TEMPLATE, ws);
      await saveDownloadResponse(res, "categories_template.xlsx");
      toast.success("Template downloaded successfully.");
    } catch {
      toast.error("Failed to download template.");
    }
  }

  async function handleBulkUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await api<{ jobId: string; status: string; enqueuedCount: number }>(
        ROUTES.CATEGORIES.BULK_UPLOAD,
        {
          method: "POST",
          workspaceId: ws,
          body: formData
        }
      );
      toast.success(
        `Queued import for ${res.enqueuedCount} categories. They will be created shortly.`
      );
      setBulkOpen(false);
      setSelectedFile(null);
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to import categories.";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Categories"
        description="Organize tasks into categories. Each task belongs to one category."
        secondary={
          <AppBarListToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search categories…"
            searchAriaLabel="Search categories"
          />
        }
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full gap-2 sm:w-auto"
            onClick={() => setBulkOpen(true)}
          >
            <Upload className="size-4" aria-hidden />
            Bulk import
          </Button>
          <Button type="submit" disabled={saving} className="h-10 w-full gap-2 sm:w-auto">
            <Plus className="size-4" aria-hidden />
            Add category
          </Button>
        </div>
      </form>

      <DataTableCard>
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
              onLimitChange={setLimit}
              disabled={loading}
            />
          </>
        )}
      </DataTableCard>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <AppModal
        open={bulkOpen}
        onOpenChange={(open) => {
          setBulkOpen(open);
          if (!open) setSelectedFile(null);
        }}
        title="Bulk import categories"
        description="Create multiple categories at once using an Excel spreadsheet template."
        icon={<Upload className="size-5" />}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBulkOpen(false);
                setSelectedFile(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="bulk-category-form" disabled={uploading || !selectedFile}>
              {uploading ? "Importing…" : "Import categories"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">1. Get the template</h4>
              <p className="text-xs text-muted-foreground">
                Download the Excel sheet with Name and Description columns.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => void handleDownloadTemplate()}
            >
              <Download className="size-3.5" />
              Template
            </Button>
          </div>

          <form id="bulk-category-form" onSubmit={handleBulkUpload} className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">2. Upload completed file</h4>
              <div className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 transition-colors hover:bg-accent/5">
                <input
                  type="file"
                  accept=".xlsx"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                  }}
                />
                <FileSpreadsheet className="mb-2 size-10 text-muted-foreground" />
                <p className="text-center text-sm font-medium">
                  {selectedFile ? selectedFile.name : "Click or drag Excel template here to upload"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Only .xlsx files up to 2MB are supported
                </p>
              </div>
            </div>
          </form>
        </div>
      </AppModal>
    </div>
  );
}
