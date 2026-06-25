"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  MemberEmailDeliveryDto,
  WorkspaceAdminOverviewDto,
  WorkspaceListItemDto
} from "@kloqra/contracts";
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
  SearchableMultiSelect,
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
import { canManageOrganization, fetchListItems } from "@kloqra/web-shared";
import { Building2, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WorkspaceAdminAssignDialog } from "../components/workspace-admin-assign-dialog";
import { useWorkspaceAdminsOverview } from "./use-workspace-admins-overview";
import { WorkspaceAdminActions } from "./workspace-admin-actions";
import { WorkspaceAdminProfileDialog } from "./workspace-admin-profile-dialog";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { formatLastActive, formatWeekHours } from "@/features/team-management/format-last-active";
import { buildClientImpersonationUrl } from "@/features/team-management/impersonation-redirect";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

export function WorkspaceAdminsPage() {
  const session = useSessionStore((s) => s.session);
  const ws = session?.workspaceId ?? getWorkspaceId() ?? "";
  const canManage = canManageOrganization(session);

  const [workspaceFilter, setWorkspaceFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "inactive">("ALL");
  const [membershipFilter, setMembershipFilter] = useState<"ALL" | "active" | "inactive">("ALL");
  const [workspaces, setWorkspaces] = useState<WorkspaceListItemDto[]>([]);

  const {
    admins,
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
  } = useWorkspaceAdminsOverview({
    workspaceIds: workspaceFilter,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    membershipActive: membershipFilter === "ALL" ? undefined : membershipFilter === "active"
  });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [profileTarget, setProfileTarget] = useState<WorkspaceAdminOverviewDto | null>(null);
  const [assignTarget, setAssignTarget] = useState<{ id: string; name: string } | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [demoteTarget, setDemoteTarget] = useState<WorkspaceAdminOverviewDto | null>(null);
  const [removeTarget, setRemoveTarget] = useState<WorkspaceAdminOverviewDto | null>(null);

  useEffect(() => {
    if (!ws) return;
    void fetchListItems<WorkspaceListItemDto>(ROUTES.TENANTS.WORKSPACES, { workspaceId: ws })
      .then(setWorkspaces)
      .catch(() => setWorkspaces([]));
  }, [ws]);

  async function patchAdmin(
    admin: WorkspaceAdminOverviewDto,
    body: Record<string, unknown>,
    successMessage: string
  ) {
    setBusyId(admin.workspaceMemberId);
    try {
      await api(ROUTES.TENANTS.WORKSPACE_MEMBER(admin.workspaceId, admin.workspaceMemberId), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify(body)
      });
      toast.success(successMessage);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update workspace admin.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleResend(admin: WorkspaceAdminOverviewDto) {
    setBusyId(admin.workspaceMemberId);
    try {
      const res = await api<MemberEmailDeliveryDto>(
        ROUTES.TENANTS.WORKSPACE_MEMBER_RESEND(admin.workspaceId, admin.workspaceMemberId),
        { method: "POST", workspaceId: ws }
      );
      if (res.emailSent) {
        toast.success(`Sign-in email sent to ${admin.userEmail}.`);
      } else {
        toast.error("Could not send sign-in email.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend sign-in email.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(admin: WorkspaceAdminOverviewDto) {
    setBusyId(admin.workspaceMemberId);
    try {
      await api(ROUTES.TENANTS.WORKSPACE_MEMBER(admin.workspaceId, admin.workspaceMemberId), {
        method: "DELETE",
        workspaceId: ws
      });
      toast.success(`${admin.userName} was removed from ${admin.workspaceName}.`);
      setRemoveTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove workspace admin.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleImpersonate(admin: WorkspaceAdminOverviewDto) {
    setBusyId(admin.workspaceMemberId);
    try {
      const result = await api<{ handoffToken: string }>(ROUTES.AUTH.IMPERSONATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ userId: admin.userId })
      });
      if (!result.handoffToken) throw new Error("Impersonation handoff token missing");
      toast.success("Impersonation ready. Redirecting to Client…");
      const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL ?? "http://localhost:3000";
      window.location.href = buildClientImpersonationUrl(clientUrl, result.handoffToken);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to view as member");
    } finally {
      setBusyId(null);
    }
  }

  if (!canManage) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Organization access is required to manage workspace admins.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Workspace admins"
        description="Search, filter, and manage workspace administrators across your organization."
        secondary={
          <AppBarListToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search workspace admins…"
            searchAriaLabel="Search workspace admins"
            filters={
              <>
                <SearchableMultiSelect
                  options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
                  value={workspaceFilter}
                  onChange={setWorkspaceFilter}
                  placeholder="Filter workspaces…"
                  searchPlaceholder="Search workspaces…"
                  emptyMessage="No workspaces found."
                  triggerClassName={appBarListFilterTriggerClass}
                />
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
                    aria-label="Filter by membership"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All memberships</SelectItem>
                    <SelectItem value="active">Active memberships</SelectItem>
                    <SelectItem value="inactive">Inactive memberships</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
            action={
              <Button
                type="button"
                onClick={() => {
                  setAssignTarget(null);
                  setAssignOpen(true);
                }}
              >
                Assign workspace admin
              </Button>
            }
          />
        }
      />

      <div className="bg-muted p-4 font-mono text-xs text-muted-foreground overflow-auto">
        DEBUG workspaces: {JSON.stringify(workspaces)}
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-4">
              <DashboardStatCard
                label="Workspace admins"
                value={String(summary.totalAdmins)}
                hint="Admin assignments across workspaces"
                icon={Users}
                tone="primary"
              />
            </CardContent>
          </Card>
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-4">
              <DashboardStatCard
                label="Active admins"
                value={String(summary.activeAdmins)}
                hint="Recently active administrators"
                icon={UserCheck}
                tone="success"
              />
            </CardContent>
          </Card>
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-4">
              <DashboardStatCard
                label="Workspaces covered"
                value={String(summary.workspacesWithAdmins)}
                hint="Workspaces with an active admin"
                icon={Building2}
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
        ) : admins.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No workspace admins yet"
              description="Assign administrators to workspaces so they can manage teams and projects."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" onClick={() => setAssignOpen(true)}>
                    Assign workspace admin
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/account/workspaces">Go to Workspaces</Link>
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
                  <DataTableHead>Admin</DataTableHead>
                  <DataTableHead>Workspace</DataTableHead>
                  <DataTableHead>Activity</DataTableHead>
                  <DataTableHead>Hours this week</DataTableHead>
                  <DataTableHead>Last active</DataTableHead>
                  <DataTableHead className="text-right">Actions</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.workspaceMemberId}>
                    <DataTableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{admin.userName}</p>
                        <p className="text-xs text-muted-foreground">{admin.userEmail}</p>
                      </div>
                    </DataTableCell>
                    <DataTableCell>{admin.workspaceName}</DataTableCell>
                    <DataTableCell>
                      <Badge variant={admin.status === "active" ? "default" : "secondary"}>
                        {admin.status}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>{formatWeekHours(admin.weekHours)}</DataTableCell>
                    <DataTableCell>
                      {formatLastActive(admin.lastActiveAt, admin.isTrackingNow)}
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <WorkspaceAdminActions
                        admin={admin}
                        busy={busyId === admin.workspaceMemberId}
                        onViewProfile={() => setProfileTarget(admin)}
                        onAssignWorkspace={() => {
                          setAssignTarget({ id: admin.workspaceId, name: admin.workspaceName });
                          setAssignOpen(true);
                        }}
                        onResendCredentials={() => void handleResend(admin)}
                        onChangeStatus={(isActive) =>
                          void patchAdmin(
                            admin,
                            { isActive },
                            isActive ? "Admin activated." : "Admin deactivated."
                          )
                        }
                        onDemote={() => setDemoteTarget(admin)}
                        onRemove={() => setRemoveTarget(admin)}
                        onViewAsMember={() => void handleImpersonate(admin)}
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

      <WorkspaceAdminProfileDialog admin={profileTarget} onClose={() => setProfileTarget(null)} />

      {assignOpen ? (
        <WorkspaceAdminAssignDialog
          workspaceId={assignTarget?.id}
          workspaceName={assignTarget?.name}
          open={assignOpen}
          onOpenChange={setAssignOpen}
          onAssigned={() => void reload()}
        />
      ) : null}

      <ConfirmDialog
        open={demoteTarget !== null}
        title="Demote workspace admin?"
        description={
          demoteTarget
            ? `${demoteTarget.userName} will remain on ${demoteTarget.workspaceName} as a regular member.`
            : undefined
        }
        confirmLabel="Demote to member"
        destructive
        onConfirm={() =>
          demoteTarget &&
          void patchAdmin(demoteTarget, { role: "MEMBER" }, "Admin demoted to member.")
        }
        onCancel={() => setDemoteTarget(null)}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove from workspace?"
        description={
          removeTarget
            ? `${removeTarget.userName} will lose access to ${removeTarget.workspaceName}.`
            : undefined
        }
        confirmLabel="Remove admin"
        destructive
        onConfirm={() => removeTarget && void handleRemove(removeTarget)}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
