"use client";

import { ROUTES } from "@kloqra/contracts";
import type { ProjectListItemDto, ProjectManagerOverviewDto } from "@kloqra/contracts";
import {
  AppBar,
  AppBarListToolbar,
  appBarListFilterTriggerClass,
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow,
  TableLoadingState
} from "@kloqra/ui";
import { fetchListItems } from "@kloqra/web-shared";
import { FolderKanban, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatLastActive, formatWeekHours } from "../team-management/format-last-active";
import { buildClientImpersonationUrl } from "../team-management/impersonation-redirect";
import { AssignProjectManagerDialog } from "./assign-project-manager-dialog";
import { ProjectManagerActions } from "./project-manager-actions";
import { ProjectManagerAssignmentsDialog } from "./project-manager-assignments-dialog";
import { ProjectManagerProfileDialog } from "./project-manager-profile-dialog";
import { useProjectManagersOverview } from "./use-project-managers-overview";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

function managedProjectsLabel(manager: ProjectManagerOverviewDto): string {
  if (!manager.managedProjects || manager.managedProjects.length === 0) return "—";
  if (manager.managedProjects.length === 1) return manager.managedProjects[0]!.projectName;
  const first = manager.managedProjects[0]!.projectName;
  return `${first} +${manager.managedProjects.length - 1}`;
}

export function ProjectManagersPage() {
  const session = useSessionStore((s) => s.session);
  const ws = session?.workspaceId ?? getWorkspaceId() ?? "";

  const [projectFilter, setProjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "inactive">("ALL");
  const [membershipFilter, setMembershipFilter] = useState<"ALL" | "active" | "inactive">("ALL");
  const [assignmentFilter, setAssignmentFilter] = useState<"ALL" | "active" | "inactive">("ALL");
  const [projects, setProjects] = useState<ProjectListItemDto[]>([]);

  const {
    managers,
    summary,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit,
    setLimit,
    loading,
    error,
    reload
  } = useProjectManagersOverview(ws, {
    projectId: projectFilter === "ALL" ? undefined : projectFilter,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    membershipActive: membershipFilter === "ALL" ? undefined : membershipFilter === "active",
    assignmentActive: assignmentFilter === "ALL" ? undefined : assignmentFilter === "active"
  });

  const [managerBusyId, setManagerBusyId] = useState<string | null>(null);
  const [profileTarget, setProfileTarget] = useState<ProjectManagerOverviewDto | null>(null);
  const [assignmentsTarget, setAssignmentsTarget] = useState<ProjectManagerOverviewDto | null>(
    null
  );
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPresetUserId, setAssignPresetUserId] = useState<string | undefined>();
  const [demoteAllTarget, setDemoteAllTarget] = useState<ProjectManagerOverviewDto | null>(null);

  useEffect(() => {
    if (!ws) return;
    void fetchListItems<ProjectListItemDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws })
      .then(setProjects)
      .catch(() => setProjects([]));
  }, [ws]);

  async function handleImpersonate(manager: ProjectManagerOverviewDto) {
    setManagerBusyId(manager.userId);
    try {
      const result = await api<{ handoffToken: string }>(ROUTES.AUTH.IMPERSONATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ userId: manager.userId })
      });
      if (!result.handoffToken) {
        throw new Error("Impersonation handoff token missing from API response");
      }
      toast.success("Impersonation ready. Redirecting to Client…");
      let clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL;
      if (!clientUrl) {
        if (typeof window !== "undefined") {
          const host = window.location.hostname;
          clientUrl = host.includes("vercel.app")
            ? `https://${host.replace("-admin", "-client")}`
            : "http://localhost:3000";
        } else {
          clientUrl = "http://localhost:3000";
        }
      }
      window.location.href = buildClientImpersonationUrl(clientUrl, result.handoffToken);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to view as member");
    } finally {
      setManagerBusyId(null);
    }
  }

  async function handleDemoteAll(manager: ProjectManagerOverviewDto) {
    setManagerBusyId(manager.userId);
    try {
      await Promise.all(
        manager.managedProjects.map((project) =>
          api(ROUTES.PROJECTS.TEAM_MEMBER(project.projectId, project.teamMemberId), {
            method: "PATCH",
            workspaceId: ws,
            body: JSON.stringify({ role: "MEMBER" })
          })
        )
      );
      toast.success(`${manager.userName} is no longer a project manager.`);
      setDemoteAllTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove project manager roles.");
    } finally {
      setManagerBusyId(null);
    }
  }

  function openAssignForManager(manager?: ProjectManagerOverviewDto) {
    setAssignPresetUserId(manager?.userId);
    setAssignOpen(true);
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Project managers"
        description="Assign and manage project managers across your workspace."
        secondary={
          <AppBarListToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search project managers…"
            searchAriaLabel="Search project managers"
            filters={
              <>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by project"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as "ALL" | "active" | "inactive")}
                >
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by activity"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All activity</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={membershipFilter}
                  onValueChange={(value) =>
                    setMembershipFilter(value as "ALL" | "active" | "inactive")
                  }
                >
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by workspace membership"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All members</SelectItem>
                    <SelectItem value="active">Active members</SelectItem>
                    <SelectItem value="inactive">Inactive members</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={assignmentFilter}
                  onValueChange={(value) =>
                    setAssignmentFilter(value as "ALL" | "active" | "inactive")
                  }
                >
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by assignment status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All assignments</SelectItem>
                    <SelectItem value="active">Active assignments</SelectItem>
                    <SelectItem value="inactive">Inactive assignments</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
            action={
              <Button type="button" onClick={() => openAssignForManager()}>
                Assign project manager
              </Button>
            }
          />
        }
      />

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-4">
              <DashboardStatCard
                label="Project managers"
                value={String(summary.totalManagers)}
                hint="Members with project manager role"
                icon={Users}
                tone="primary"
              />
            </CardContent>
          </Card>
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-4">
              <DashboardStatCard
                label="Active managers"
                value={String(summary.activeManagers)}
                hint="Recently active in workspace"
                icon={UserCheck}
                tone="success"
              />
            </CardContent>
          </Card>
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-4">
              <DashboardStatCard
                label="Projects with leads"
                value={String(summary.totalLedProjects)}
                hint="Unique projects with an active lead"
                icon={FolderKanban}
                tone="premium"
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      <DataTableCard>
        {error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : loading ? (
          <TableLoadingState rows={5} columns={6} />
        ) : managers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No project managers yet"
              description="Assign workspace members as project managers to give them scoped admin access."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" onClick={() => openAssignForManager()}>
                    Assign project manager
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/team-management">Go to Team Management</Link>
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Manager</DataTableHead>
                  <DataTableHead>Projects led</DataTableHead>
                  <DataTableHead>Activity</DataTableHead>
                  <DataTableHead>Hours this week</DataTableHead>
                  <DataTableHead>Last active</DataTableHead>
                  <DataTableHead className="text-right">Actions</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {managers.map((manager) => (
                  <TableRow key={manager.userId}>
                    <DataTableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{manager.userName}</p>
                        <p className="text-xs text-muted-foreground">{manager.userEmail}</p>
                        {!manager.isWorkspaceMemberActive ? (
                          <Badge variant="secondary">Workspace inactive</Badge>
                        ) : null}
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <div className="space-y-1">
                        <p>{managedProjectsLabel(manager)}</p>
                        <p className="text-xs text-muted-foreground">
                          {manager.activeLedProjectCount} active of {manager.managedProjectCount}
                        </p>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={manager.status === "active" ? "default" : "secondary"}>
                        {manager.status}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>{formatWeekHours(manager.weekHours)}</DataTableCell>
                    <DataTableCell>
                      {formatLastActive(manager.lastActiveAt, manager.isTrackingNow)}
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <ProjectManagerActions
                        manager={manager}
                        busy={managerBusyId === manager.userId}
                        onViewProfile={() => setProfileTarget(manager)}
                        onManageAssignments={() => setAssignmentsTarget(manager)}
                        onAssignProject={() => openAssignForManager(manager)}
                        onViewAsMember={() => void handleImpersonate(manager)}
                        onDemoteAll={() => setDemoteAllTarget(manager)}
                      />
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
              onLimitChange={setLimit}
              disabled={loading}
            />
          </>
        )}
      </DataTableCard>

      <ProjectManagerProfileDialog manager={profileTarget} onClose={() => setProfileTarget(null)} />
      <ProjectManagerAssignmentsDialog
        manager={assignmentsTarget}
        workspaceId={ws}
        onClose={() => setAssignmentsTarget(null)}
        onChanged={reload}
      />
      <AssignProjectManagerDialog
        open={assignOpen}
        workspaceId={ws}
        presetUserId={assignPresetUserId}
        onClose={() => {
          setAssignOpen(false);
          setAssignPresetUserId(undefined);
        }}
        onAssigned={reload}
      />
      <ConfirmDialog
        open={demoteAllTarget !== null}
        title="Remove all project manager roles?"
        description={
          demoteAllTarget
            ? `${demoteAllTarget.userName} will remain on assigned projects as a regular team member.`
            : undefined
        }
        confirmLabel="Remove PM roles"
        destructive
        onConfirm={() => demoteAllTarget && void handleDemoteAll(demoteAllTarget)}
        onCancel={() => setDemoteAllTarget(null)}
      />
    </div>
  );
}
