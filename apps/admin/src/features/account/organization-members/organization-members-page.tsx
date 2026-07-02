"use client";

import { ROUTES } from "@kloqra/contracts";
import type { InviteTenantMemberResponseDto, TenantMemberDto } from "@kloqra/contracts";
import {
  AppBar,
  AppBarListToolbar,
  appBarListFilterTriggerClass,
  AppModal,
  Badge,
  Button,
  ConfirmDialog,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableHeader,
  TableRow,
  TableLoadingState
} from "@kloqra/ui";
import { isOrganizationOwner, useTenantMembers } from "@kloqra/web-shared";
import { UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

function roleLabel(role: TenantMemberDto["role"]): string {
  return role === "OWNER" ? "Organization owner" : "Organization admin";
}

export function OrganizationMembersPage() {
  const session = useSessionStore((s) => s.session);
  const ws = session?.workspaceId ?? getWorkspaceId() ?? "";
  const isOwner = isOrganizationOwner(session);
  const { members, loading, error, reload } = useTenantMembers();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "OWNER" | "ADMIN">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "inactive">("ALL");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<TenantMemberDto | null>(null);

  const filteredMembers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return members.filter((member) => {
      if (roleFilter !== "ALL" && member.role !== roleFilter) return false;
      if (statusFilter === "active" && !member.isActive) return false;
      if (statusFilter === "inactive" && member.isActive) return false;
      if (!normalized) return true;
      return (
        member.userName.toLowerCase().includes(normalized) ||
        member.userEmail.toLowerCase().includes(normalized)
      );
    });
  }, [members, search, roleFilter, statusFilter]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      toast.error("Email and name are required.");
      return;
    }
    setInviting(true);
    try {
      const res = await api<InviteTenantMemberResponseDto>(ROUTES.TENANTS.MEMBERS, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          role: "ADMIN"
        })
      });
      toast.success(`Organization admin invited: ${res.member.userEmail}`);
      setInviteOpen(false);
      setEmail("");
      setName("");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not invite organization admin.");
    } finally {
      setInviting(false);
    }
  }

  async function toggleActive(member: TenantMemberDto, isActive: boolean) {
    setBusyId(member.id);
    try {
      await api(ROUTES.TENANTS.MEMBER(member.id), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({ isActive })
      });
      toast.success(
        isActive ? `${member.userName} was reactivated.` : `${member.userName} was deactivated.`
      );
      setDeactivateTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update member.");
    } finally {
      setBusyId(null);
    }
  }

  if (!isOwner) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Only the organization owner can manage organization members.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Organization members"
        description="Invite organization admins who can manage workspaces and workspace admins."
        secondary={
          <AppBarListToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search organization members…"
            searchAriaLabel="Search organization members"
            filters={
              <>
                <Select
                  value={roleFilter}
                  onValueChange={(value) => setRoleFilter(value as "ALL" | "OWNER" | "ADMIN")}
                >
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by role"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All roles</SelectItem>
                    <SelectItem value="OWNER">Owners</SelectItem>
                    <SelectItem value="ADMIN">Organization admins</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as "ALL" | "active" | "inactive")}
                >
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
            action={
              <Button type="button" onClick={() => setInviteOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite organization admin
              </Button>
            }
          />
        }
      />

      <DataTableCard>
        {error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : loading ? (
          <TableLoadingState rows={4} columns={4} />
        ) : filteredMembers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No organization members found"
              description="Invite an organization admin to help manage workspaces."
              action={
                <Button type="button" onClick={() => setInviteOpen(true)}>
                  Invite organization admin
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <DataTableHeaderRow>
                <DataTableHead>Member</DataTableHead>
                <DataTableHead>Role</DataTableHead>
                <DataTableHead>Status</DataTableHead>
                <DataTableHead className="text-right">Actions</DataTableHead>
              </DataTableHeaderRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <DataTableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{member.userName}</p>
                      <p className="text-xs text-muted-foreground">{member.userEmail}</p>
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
                      {roleLabel(member.role)}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={member.isActive ? "default" : "secondary"}>
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    {member.role === "OWNER" ? (
                      <span className="text-xs italic text-muted-foreground">Owner</span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busyId === member.id}
                        onClick={() =>
                          member.isActive
                            ? setDeactivateTarget(member)
                            : void toggleActive(member, true)
                        }
                      >
                        {member.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </DataTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTableCard>

      <AppModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite organization admin"
        description="Organization admins can manage the organization profile, workspaces, and workspace admins."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="invite-org-admin-form" disabled={inviting}>
              {inviting ? "Inviting…" : "Send invite"}
            </Button>
          </>
        }
      >
        <form id="invite-org-admin-form" onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-admin-email">Email</Label>
            <Input
              id="org-admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-admin-name">Name</Label>
            <Input
              id="org-admin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Admin"
            />
          </div>
        </form>
      </AppModal>

      <ConfirmDialog
        open={deactivateTarget !== null}
        title="Deactivate organization admin?"
        description={
          deactivateTarget
            ? `${deactivateTarget.userName} will lose organization admin access.`
            : undefined
        }
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => deactivateTarget && void toggleActive(deactivateTarget, false)}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
