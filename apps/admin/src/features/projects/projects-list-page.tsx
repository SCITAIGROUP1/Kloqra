"use client";

import { ROUTES, PROJECT_COLORS, pickDefaultProjectColor } from "@chronomint/contracts";
import type { ProjectDto } from "@chronomint/contracts";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  EmptyState,
  Input,
  Label,
  PageHeader,
  ProjectColorPicker,
  ProjectNameWithColor,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@chronomint/ui";
import { ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

export function ProjectsListPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [createColor, setCreateColor] = useState(() => pickDefaultProjectColor(0));
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!ws) return;
    setLoading(true);
    api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws })
      .then(setProjects)
      .catch(() => setError("Could not load projects."))
      .finally(() => setLoading(false));
  }, [ws]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.clientName?.toLowerCase().includes(q) ?? false)
    );
  }, [projects, search]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api(ROUTES.PROJECTS.CREATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ name, clientName, color: createColor })
      });
      const list = await api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws });
      setProjects(list);
      setName("");
      setClientName("");
      setCreateColor(pickDefaultProjectColor(list.length + 1));
      setCreateOpen(false);
    } catch {
      setError("Could not create project.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description="Browse workspace projects and open one to manage tasks, team, and settings."
        actions={
          <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            New project
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or client…"
          className="pl-9"
          aria-label="Search projects"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={projects.length === 0 ? "No projects yet" : "No matching projects"}
          description={
            projects.length === 0
              ? "Create your first project to organize time tracking and teams."
              : "Try a different search term."
          }
          action={
            projects.length === 0 ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                New project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="group relative cursor-pointer hover:bg-muted/40">
                  <TableCell className="py-3.5 pl-4">
                    <Link
                      href={`/projects/${p.id}/tasks`}
                      className="block after:absolute after:inset-0"
                    >
                      <ProjectNameWithColor name={p.name} color={p.color} />
                    </Link>
                  </TableCell>
                  <TableCell className="py-3.5 text-muted-foreground">
                    <Link href={`/projects/${p.id}/tasks`} className="block">
                      {p.clientName ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Link href={`/projects/${p.id}/tasks`} className="block">
                      <Badge variant={p.isActive ? "default" : "secondary"}>
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="py-3.5 pr-4 text-muted-foreground">
                    <Link href={`/projects/${p.id}/tasks`} className="inline-flex">
                      <ChevronRight
                        className="h-4 w-4 opacity-40 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <AlertDialog open={createOpen} onOpenChange={setCreateOpen}>
        <AlertDialogContent className="sm:max-w-[480px]">
          <AlertDialogHeader>
            <AlertDialogTitle>New project</AlertDialogTitle>
            <AlertDialogDescription>
              Add a project to organize tasks, teams, and time entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={createProject} className="space-y-4 py-2">
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
            <AlertDialogFooter className="pt-2">
              <AlertDialogCancel type="button" onClick={() => setCreateOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create project"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
