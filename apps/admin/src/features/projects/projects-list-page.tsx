"use client";

import { ROUTES, PROJECT_COLORS, pickDefaultProjectColor } from "@kloqra/contracts";
import type { ProjectDto } from "@kloqra/contracts";
import {
  AppModal,
  AppBar,
  Badge,
  Button,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  EmptyState,
  Input,
  Label,
  ProjectColorPicker,
  ProjectNameWithColor,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow,
  TableToolbar,
  TableLoadingState
} from "@kloqra/ui";
import { usePaginatedList } from "@kloqra/web-shared";
import { ChevronRight, FolderPlus, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

export function ProjectsListPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const {
    items: projects,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit,
    loading,
    error,
    reload
  } = usePaginatedList<ProjectDto>({
    workspaceId: ws,
    basePath: ROUTES.PROJECTS.LIST
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [createColor, setCreateColor] = useState(() => pickDefaultProjectColor(0));
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setActionError(null);
    try {
      const projectName = name.trim();
      await api(ROUTES.PROJECTS.CREATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ name: projectName, clientName, color: createColor })
      });
      setName("");
      setClientName("");
      setCreateColor(pickDefaultProjectColor(projects.length + 1));
      setCreateOpen(false);
      toast.success(`Project "${projectName}" created.`);
      await reload();
    } catch {
      const message = "Could not create project.";
      setActionError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <AppBar
        title="Projects"
        description="Browse workspace projects and open one to manage tasks, team, and settings."
        actions={
          <Button type="button" className="h-10 gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            New project
          </Button>
        }
      />

      <DataTableCard>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name or client…"
          searchAriaLabel="Search projects"
        />
        {loading ? (
          <TableLoadingState rows={6} columns={4} />
        ) : projects.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={total === 0 && !search ? "No projects yet" : "No matching projects"}
              description={
                total === 0 && !search
                  ? "Create your first project to organize time tracking and teams."
                  : "Try a different search term."
              }
              action={
                total === 0 && !search ? (
                  <Button type="button" onClick={() => setCreateOpen(true)}>
                    New project
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Name</DataTableHead>
                  <DataTableHead>Client</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead className="w-10" />
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id} className="group relative cursor-pointer hover:bg-muted/40">
                    <DataTableCell>
                      <Link
                        href={`/projects/${p.id}/tasks`}
                        className="block after:absolute after:inset-0"
                      >
                        <ProjectNameWithColor name={p.name} color={p.color} />
                      </Link>
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      <Link href={`/projects/${p.id}/tasks`} className="block">
                        {p.clientName ?? "—"}
                      </Link>
                    </DataTableCell>
                    <DataTableCell>
                      <Link href={`/projects/${p.id}/tasks`} className="block">
                        <Badge variant={p.isActive ? "default" : "secondary"}>
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </Link>
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      <Link href={`/projects/${p.id}/tasks`} className="inline-flex">
                        <ChevronRight
                          className="h-4 w-4 opacity-40 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                      </Link>
                    </DataTableCell>
                  </TableRow>
                ))}
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

      {error || actionError ? (
        <p className="text-sm text-destructive">{error ?? actionError}</p>
      ) : null}

      <AppModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New project"
        description="Add a project to organize tasks, teams, and time entries."
        icon={<FolderPlus className="size-5" />}
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-project-form" disabled={creating}>
              {creating ? "Creating…" : "Create project"}
            </Button>
          </>
        }
      >
        <form id="create-project-form" onSubmit={createProject} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Meridian Product Co"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Input
              id="client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Acme Corp"
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <ProjectColorPicker
              value={createColor}
              onChange={setCreateColor}
              colors={PROJECT_COLORS}
            />
          </div>
        </form>
      </AppModal>
    </div>
  );
}
