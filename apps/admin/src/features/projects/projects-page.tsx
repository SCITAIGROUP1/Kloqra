"use client";

import {
  ROUTES,
  PROJECT_COLORS,
  DEFAULT_PROJECT_COLOR,
  pickDefaultProjectColor
} from "@chronomint/contracts";
import type { ProjectDto, TeamDto, TeamInviteDto, TeamMemberDto } from "@chronomint/contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ProjectColorEditor,
  ProjectColorPicker,
  ProjectNameWithColor,
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
import { useEffect, useState } from "react";
import { ProjectTasksPanel } from "./project-tasks-panel";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

function memberIsActive(m: TeamMemberDto): boolean {
  return m.isActive !== false;
}

export function AdminProjectsPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [invite, setInvite] = useState<TeamInviteDto | null>(null);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [createColor, setCreateColor] = useState(() => pickDefaultProjectColor(0));
  const [inviteEmail, setInviteEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editApprovalEnabled, setEditApprovalEnabled] = useState(false);
  const [editApprovalPeriod, setEditApprovalPeriod] = useState<"daily" | "weekly" | "monthly" | "">(
    ""
  );
  const [error, setError] = useState<string | null>(null);
  const [savingColor, setSavingColor] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);

  const selected = projects.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
  }, [ws]);

  useEffect(() => {
    if (!selectedId) {
      setTeam(null);
      setInvite(null);
      return;
    }
    api<TeamDto>(ROUTES.PROJECTS.TEAM(selectedId), { workspaceId: ws }).then(setTeam);
    setInvite(null);
  }, [selectedId, ws]);

  useEffect(() => {
    if (!selected) return;
    setEditName(selected.name);
    setEditClient(selected.clientName ?? "");
    setEditIsActive(selected.isActive);
    setEditApprovalEnabled(selected.timesheetApprovalEnabled);
    setEditApprovalPeriod(selected.timesheetApprovalPeriod ?? "");
  }, [
    selected?.id,
    selected?.name,
    selected?.clientName,
    selected?.isActive,
    selected?.timesheetApprovalEnabled,
    selected?.timesheetApprovalPeriod
  ]);

  async function refreshProjects(keepSelection = true) {
    const list = await api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws });
    setProjects(list);
    if (!keepSelection) setSelectedId(null);
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api(ROUTES.PROJECTS.CREATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ name, clientName, color: createColor })
      });
      await refreshProjects();
      setName("");
      setClientName("");
      setCreateColor(pickDefaultProjectColor(projects.length + 1));
    } catch {
      setError("Could not create project.");
    }
  }

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setSavingProject(true);
    setError(null);
    try {
      const updated = await api<ProjectDto>(ROUTES.PROJECTS.BY_ID(selectedId), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({
          name: editName.trim(),
          clientName: editClient.trim() || undefined,
          isActive: editIsActive,
          timesheetApprovalEnabled: editApprovalEnabled,
          timesheetApprovalPeriod: editApprovalPeriod || undefined
        })
      });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch {
      setError("Could not save project.");
    } finally {
      setSavingProject(false);
    }
  }

  async function updateProjectColor(color: string) {
    if (!selectedId) return;
    setSavingColor(true);
    setError(null);
    try {
      const updated = await api<ProjectDto>(ROUTES.PROJECTS.BY_ID(selectedId), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({ color })
      });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch {
      setError("Could not update project color.");
    } finally {
      setSavingColor(false);
    }
  }

  async function setMemberActive(member: TeamMemberDto, isActive: boolean) {
    if (!selectedId) return;
    setMemberBusyId(member.id);
    setError(null);
    try {
      await api(ROUTES.PROJECTS.TEAM_MEMBER(selectedId, member.id), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({ isActive })
      });
      setTeam((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.map((m) => (m.id === member.id ? { ...m, isActive } : m))
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update team member.");
    } finally {
      setMemberBusyId(null);
    }
  }

  async function removeMember(member: TeamMemberDto) {
    if (!selectedId) return;
    if (!window.confirm(`Remove ${member.userName} from this project team?`)) return;
    setMemberBusyId(member.id);
    setError(null);
    try {
      await api(ROUTES.PROJECTS.TEAM_MEMBER(selectedId, member.id), {
        method: "DELETE",
        workspaceId: ws
      });
      setTeam((prev) =>
        prev ? { ...prev, members: prev.members.filter((m) => m.id !== member.id) } : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove team member.");
    } finally {
      setMemberBusyId(null);
    }
  }

  async function createInviteLink() {
    if (!selectedId) return;
    setError(null);
    try {
      const body = inviteEmail.trim() ? { email: inviteEmail.trim() } : {};
      const link = await api<TeamInviteDto>(ROUTES.PROJECTS.TEAM_INVITES(selectedId), {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify(body)
      });
      setInvite(link);
    } catch {
      setError("Could not create invite link.");
    }
  }

  async function copyInvite() {
    if (!invite?.inviteUrl) return;
    await navigator.clipboard.writeText(invite.inviteUrl);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Projects</h2>
        <p className="text-sm text-muted-foreground">
          Workspace → Project → Team → Members. Create a project, then invite people onto its team.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>New project</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createProject} className="flex flex-wrap items-end gap-x-6 gap-y-5">
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="w-full space-y-2 sm:w-auto">
              <Label>Color</Label>
              <ProjectColorPicker
                value={createColor}
                onChange={setCreateColor}
                colors={PROJECT_COLORS}
              />
            </div>
            <Button type="submit" className="shrink-0">
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Workspace projects</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-1">Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow
                      key={p.id}
                      className={
                        selectedId === p.id ? "bg-muted/50" : "cursor-pointer hover:bg-muted/30"
                      }
                      onClick={() => setSelectedId(p.id)}
                    >
                      <TableCell className="py-3 pl-1">
                        <ProjectNameWithColor name={p.name} color={p.color} />
                      </TableCell>
                      <TableCell className="py-3">{p.clientName ?? "—"}</TableCell>
                      <TableCell className="py-3">
                        <Badge variant={p.isActive ? "default" : "secondary"}>
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>{selected ? selected.name : "Project details"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                Select a project to edit details, manage its team, and send invites.
              </p>
            ) : (
              <>
                <form onSubmit={saveProject} className="space-y-4">
                  <p className="text-sm font-medium">Project details</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Name</Label>
                      <Input
                        id="edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-client">Client</Label>
                      <Input
                        id="edit-client"
                        value={editClient}
                        onChange={(e) => setEditClient(e.target.value)}
                      />
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 rounded border border-input accent-primary"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                    />
                    <span>Project is active (inactive projects are hidden from members)</span>
                  </label>

                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border border-input accent-primary"
                        checked={editApprovalEnabled}
                        onChange={(e) => setEditApprovalEnabled(e.target.checked)}
                      />
                      <span>Require timesheet approval</span>
                    </label>
                    {editApprovalEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="approval-period">Approval period</Label>
                        <Select
                          value={editApprovalPeriod || "default"}
                          onValueChange={(v) =>
                            setEditApprovalPeriod(
                              v === "default" ? "" : (v as "daily" | "weekly" | "monthly")
                            )
                          }
                        >
                          <SelectTrigger id="approval-period">
                            <SelectValue placeholder="Use workspace default (weekly)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Workspace default (weekly)</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Members must submit and get approval before entries on this project are
                          locked.
                        </p>
                      </div>
                    )}
                  </div>

                  <Button type="submit" size="sm" disabled={savingProject}>
                    {savingProject ? "Saving…" : "Save project"}
                  </Button>
                </form>

                <div className="space-y-3 border-t pt-6">
                  <ProjectColorEditor
                    value={selected.color ?? DEFAULT_PROJECT_COLOR}
                    onChange={updateProjectColor}
                    colors={PROJECT_COLORS}
                  />
                  {savingColor ? (
                    <p className="text-xs text-muted-foreground">Saving color…</p>
                  ) : null}
                </div>

                <div className="space-y-3 border-t pt-6">
                  <p className="text-sm font-medium">Team members</p>
                  {!team || team.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No one on this team yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {team.members.map((m) => (
                        <li
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-medium leading-tight">{m.userName}</p>
                            <p className="truncate text-xs text-muted-foreground">{m.userEmail}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={memberIsActive(m) ? "default" : "secondary"}>
                              {memberIsActive(m) ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={memberBusyId === m.id}
                              onClick={() => setMemberActive(m, !memberIsActive(m))}
                            >
                              {memberIsActive(m) ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={memberBusyId === m.id}
                              onClick={() => removeMember(m)}
                            >
                              Remove
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <ProjectTasksPanel workspaceId={ws} projectId={selected.id} />

                <div className="space-y-4 border-t pt-6">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Invite to team</p>
                    <p className="text-xs text-muted-foreground">
                      Members join the project team via this link (expires in 7 days).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email (optional)</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="member@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <Button type="button" onClick={createInviteLink}>
                    Generate invite link
                  </Button>
                  {invite ? (
                    <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                      <p className="break-all font-mono text-xs">{invite.inviteUrl}</p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={copyInvite}
                      >
                        Copy link
                      </Button>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
