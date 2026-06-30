"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  InviteMemberResponseDto,
  MemberEmailDeliveryDto,
  TeamMemberOverviewDto
} from "@kloqra/contracts";
import {
  AppModal,
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
  TablePagination,
  TableRow,
  TableLoadingState
} from "@kloqra/ui";
import {
  extractFieldErrorsFromMessage,
  apiDownloadGet,
  saveDownloadResponse
} from "@kloqra/web-shared";
import {
  Clock,
  Plus,
  Shield,
  UserCheck,
  UserPlus,
  Users,
  Upload,
  Download,
  FileSpreadsheet
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatLastActive, formatWeekHours } from "./format-last-active";
import { buildClientImpersonationUrl } from "./impersonation-redirect";
import { inviteMemberSuccessMessage } from "./invite-member-messages";
import { validateInviteMemberForm } from "./invite-member-validation";
import { TeamMemberActions } from "./team-member-actions";
import { TeamMemberEditDialog } from "./team-member-edit-dialog";
import { TeamMemberProfileDialog } from "./team-member-profile-dialog";
import { useTeamMembersOverview } from "./use-team-members-overview";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function roleLabel(role: "ADMIN" | "MEMBER"): string {
  return role === "ADMIN" ? "Admin" : "Member";
}

export function TeamManagementPage() {
  const session = useSessionStore((s) => s.session);
  const ws = session?.workspaceId ?? getWorkspaceId() ?? "";

  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "MEMBER">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "inactive">("ALL");

  const {
    members,
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
    reload
  } = useTeamMembersOverview(ws, {
    role: roleFilter === "ALL" ? undefined : roleFilter,
    status: statusFilter === "ALL" ? undefined : statusFilter
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteFieldErrors, setInviteFieldErrors] = useState<{ email?: string; name?: string }>({});
  const [inviting, setInviting] = useState(false);
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMemberOverviewDto | null>(null);
  const [profileTarget, setProfileTarget] = useState<TeamMemberOverviewDto | null>(null);
  const [editTarget, setEditTarget] = useState<TeamMemberOverviewDto | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteFieldErrors({});

    const fieldErrors = validateInviteMemberForm(email, name);
    if (Object.keys(fieldErrors).length > 0) {
      setInviteFieldErrors(fieldErrors);
      return;
    }

    setInviting(true);
    const invitedEmail = email.trim();
    try {
      const res = await api<InviteMemberResponseDto>(ROUTES.WORKSPACES.INVITE(ws), {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          email: invitedEmail,
          role,
          name: name.trim()
        })
      });
      setEmail("");
      setName("");
      setRole("MEMBER");
      setInviteOpen(false);
      if (res.userCreated && res.emailSent) {
        toast.success(inviteMemberSuccessMessage(invitedEmail));
      } else if (res.userCreated && res.emailSkipReason === "smtp_unconfigured") {
        toast.warning(
          "Member added, but email is not configured on the API. Set SMTP variables on Railway, then use Resend sign-in email."
        );
      } else if (res.userCreated && !res.emailSent) {
        toast.warning(
          "Member added, but the welcome email could not be sent. Try Resend sign-in email."
        );
      } else if (!res.emailSent && res.emailSkipReason === "smtp_unconfigured") {
        toast.warning("Member added. Email is not configured on the API service.");
      } else {
        toast.success("Existing user added to workspace.");
      }
      await reload();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not add member. They may already be in the workspace.";
      const parsed = extractFieldErrorsFromMessage<"email" | "name">(message, {
        email: "Email",
        name: "Name"
      });
      setInviteFieldErrors(parsed.fieldErrors);
      setInviteError(
        parsed.formError || (Object.keys(parsed.fieldErrors).length === 0 ? message : null)
      );
    } finally {
      setInviting(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      const res = await apiDownloadGet(ROUTES.WORKSPACES.BULK_MEMBERS_TEMPLATE(ws), ws);
      await saveDownloadResponse(res, "bulk_members_template.xlsx");
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
        ROUTES.WORKSPACES.BULK_MEMBERS_UPLOAD(ws),
        {
          method: "POST",
          workspaceId: ws,
          body: formData
        }
      );
      toast.success(
        `Successfully enqueued invitation for ${res.enqueuedCount} members. They will be registered and notified shortly.`
      );
      setBulkOpen(false);
      setSelectedFile(null);
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to import members.";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleResendCredentials(member: TeamMemberOverviewDto) {
    setMemberBusyId(member.id);
    try {
      const res = await api<MemberEmailDeliveryDto>(
        ROUTES.WORKSPACES.RESEND_CREDENTIALS(ws, member.id),
        {
          method: "POST",
          workspaceId: ws
        }
      );
      if (res.emailSent) {
        toast.success(`Sign-in email sent to ${member.userEmail}.`);
      } else if (res.emailSkipReason === "smtp_unconfigured") {
        toast.error(
          "Email is not configured on the API. Add SMTP_HOST, SMTP_USER, and SMTP_PASS on Railway."
        );
      } else {
        toast.error(
          res.emailFailureMessage
            ? `Could not send email: ${res.emailFailureMessage}`
            : "Could not send email. Check API logs and SMTP settings."
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not resend sign-in email.";
      toast.error(message);
    } finally {
      setMemberBusyId(null);
    }
  }

  async function handleImpersonate(member: TeamMemberOverviewDto) {
    setMemberBusyId(member.id);
    try {
      const result = await api<{ handoffToken: string }>(ROUTES.AUTH.IMPERSONATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ userId: member.userId })
      });
      if (!result.handoffToken) {
        throw new Error("Impersonation handoff token missing from API response");
      }
      toast.success("Impersonation ready. Redirecting to Client...");
      let clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL;
      if (!clientUrl) {
        if (typeof window !== "undefined") {
          const host = window.location.hostname;
          if (host.includes("vercel.app")) {
            clientUrl = `https://${host.replace("-admin", "-client")}`;
          } else {
            clientUrl = "http://localhost:3000";
          }
        } else {
          clientUrl = "http://localhost:3000";
        }
      }
      window.location.href = buildClientImpersonationUrl(clientUrl, result.handoffToken);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to view as member");
    } finally {
      setMemberBusyId(null);
    }
  }

  async function handleChangeStatus(member: TeamMemberOverviewDto, isActive: boolean) {
    setMemberBusyId(member.id);
    try {
      await api(ROUTES.WORKSPACES.MEMBER(ws, member.id), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({ isActive })
      });
      toast.success(
        isActive ? `${member.userName} was reactivated.` : `${member.userName} was deactivated.`
      );
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update member status.");
    } finally {
      setMemberBusyId(null);
    }
  }

  async function handleChangeRole(member: TeamMemberOverviewDto, role: "ADMIN" | "MEMBER") {
    setMemberBusyId(member.id);
    try {
      await api(ROUTES.WORKSPACES.MEMBER(ws, member.id), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({ role })
      });
      toast.success(
        role === "ADMIN"
          ? `${member.userName} is now an admin.`
          : `${member.userName} is now a member.`
      );
      setEditTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update member role.");
    } finally {
      setMemberBusyId(null);
    }
  }

  async function handleRemove(member: TeamMemberOverviewDto) {
    setMemberBusyId(member.id);
    try {
      await api(ROUTES.WORKSPACES.MEMBER(ws, member.id), {
        method: "DELETE",
        workspaceId: ws
      });
      toast.success(`${member.userName} was removed from the workspace.`);
      setRemoveTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove member.");
    } finally {
      setMemberBusyId(null);
    }
  }

  const summaryStats = summary;

  return (
    <div className="space-y-6">
      <AppBar
        title="Team Management"
        description="Manage team members, roles, and permissions."
        secondary={
          <AppBarListToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search team members…"
            searchAriaLabel="Search team members"
            filters={
              <>
                <Select
                  value={roleFilter}
                  onValueChange={(value) => setRoleFilter(value as "ALL" | "ADMIN" | "MEMBER")}
                >
                  <SelectTrigger
                    className={appBarListFilterTriggerClass}
                    aria-label="Filter by role"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All roles</SelectItem>
                    <SelectItem value="ADMIN">Admins</SelectItem>
                    <SelectItem value="MEMBER">Members</SelectItem>
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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full gap-2 sm:w-auto"
                  onClick={() => setBulkOpen(true)}
                >
                  <Upload className="h-4 w-4" aria-hidden />
                  Bulk Import
                </Button>
                <Button
                  type="button"
                  className="h-10 w-full gap-2 sm:w-auto"
                  onClick={() => setInviteOpen(true)}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add Team Member
                </Button>
              </div>
            }
          />
        }
      />

      {summaryStats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-4">
              <DashboardStatCard
                label="Total Members"
                value={String(summaryStats.totalMembers)}
                icon={Users}
                tone="primary"
              />
            </CardContent>
          </Card>
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-4">
              <DashboardStatCard
                label="Active"
                value={String(summaryStats.activeMembers)}
                hint="Active in the last 30 days"
                icon={UserCheck}
                tone="success"
              />
            </CardContent>
          </Card>
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-4">
              <DashboardStatCard
                label="Admins"
                value={String(summaryStats.adminCount)}
                icon={Shield}
                tone="premium"
              />
            </CardContent>
          </Card>
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-4">
              <DashboardStatCard
                label="Total Hours"
                value={formatWeekHours(summaryStats.totalWeekHours)}
                hint="This week"
                icon={Clock}
                tone="warning"
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      <DataTableCard>
        {loading ? (
          <TableLoadingState rows={6} columns={5} />
        ) : members.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={
                search.trim()
                  ? "No team members found matching your search."
                  : "No team members yet"
              }
              description={search.trim() ? "" : "Invite your first team member to get started."}
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Member</DataTableHead>
                  <DataTableHead>Role</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead className="text-right">Projects</DataTableHead>
                  <DataTableHead className="text-right">Hours (This Week)</DataTableHead>
                  <DataTableHead>Last Active</DataTableHead>
                  <DataTableHead className="text-right">Actions</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <DataTableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {memberInitials(member.userName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{member.userName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.userEmail}
                          </p>
                        </div>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
                        {roleLabel(member.role)}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>
                      <Badge
                        variant={
                          !member.isActive
                            ? "secondary"
                            : member.status === "active"
                              ? "outline"
                              : "secondary"
                        }
                        className={
                          !member.isActive
                            ? undefined
                            : member.status === "active"
                              ? "border-success/30 bg-success/10 text-success"
                              : undefined
                        }
                      >
                        {!member.isActive ? "deactivated" : member.status}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="text-right tabular-nums">
                      {member.projectCount}
                    </DataTableCell>
                    <DataTableCell className="text-right tabular-nums">
                      {formatWeekHours(member.weekHours)}
                    </DataTableCell>
                    <DataTableCell className="text-sm text-muted-foreground">
                      {formatLastActive(member.lastActiveAt, member.isTrackingNow)}
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <TeamMemberActions
                        member={member}
                        isSelf={member.userId === session?.user.id}
                        busy={memberBusyId === member.id}
                        onViewProfile={() => setProfileTarget(member)}
                        onEditMember={() => setEditTarget(member)}
                        onViewAsMember={() => handleImpersonate(member)}
                        onResendCredentials={() => handleResendCredentials(member)}
                        onChangeStatus={(isActive) => handleChangeStatus(member, isActive)}
                        onRemove={() => setRemoveTarget(member)}
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

      <TeamMemberProfileDialog member={profileTarget} onClose={() => setProfileTarget(null)} />

      <TeamMemberEditDialog
        member={editTarget}
        saving={editTarget !== null && memberBusyId === editTarget.id}
        onClose={() => setEditTarget(null)}
        onSave={(nextRole) => {
          if (editTarget) void handleChangeRole(editTarget, nextRole);
        }}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove team member?"
        description={
          removeTarget
            ? `${removeTarget.userName} will lose access to this workspace and its projects.`
            : undefined
        }
        confirmLabel="Remove member"
        destructive
        onConfirm={() => {
          if (removeTarget) void handleRemove(removeTarget);
        }}
        onCancel={() => setRemoveTarget(null)}
      />

      <AppModal
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setInviteError(null);
            setInviteFieldErrors({});
          }
        }}
        title="Add team member"
        description="Add a workspace member. New users receive sign-in credentials by email."
        icon={<UserPlus className="size-5" />}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setInviteOpen(false);
                setInviteError(null);
                setInviteFieldErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="invite-member-form" disabled={inviting}>
              {inviting ? "Adding…" : "Add member"}
            </Button>
          </>
        }
      >
        <form id="invite-member-form" onSubmit={handleInvite} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (inviteFieldErrors.email) {
                  setInviteFieldErrors((prev) => ({ ...prev, email: undefined }));
                }
                if (inviteError) setInviteError(null);
              }}
              placeholder="member@example.com"
              autoFocus
              aria-invalid={Boolean(inviteFieldErrors.email)}
            />
            {inviteFieldErrors.email ? (
              <p className="text-xs text-destructive">{inviteFieldErrors.email}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (inviteFieldErrors.name) {
                  setInviteFieldErrors((prev) => ({ ...prev, name: undefined }));
                }
                if (inviteError) setInviteError(null);
              }}
              placeholder="Alex Chen"
              aria-invalid={Boolean(inviteFieldErrors.name)}
            />
            {inviteFieldErrors.name ? (
              <p className="text-xs text-destructive">{inviteFieldErrors.name}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "MEMBER" | "ADMIN")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member — track time on assigned projects</SelectItem>
                <SelectItem value="ADMIN">
                  Admin — manage workspace, projects, and members
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {inviteError ? <p className="text-sm text-destructive">{inviteError}</p> : null}
        </form>
      </AppModal>

      <AppModal
        open={bulkOpen}
        onOpenChange={(open) => {
          setBulkOpen(open);
          if (!open) {
            setSelectedFile(null);
          }
        }}
        title="Bulk import members"
        description="Invite multiple team members at once using an Excel spreadsheet template."
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
            <Button type="submit" form="bulk-import-form" disabled={uploading || !selectedFile}>
              {uploading ? "Importing…" : "Import members"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">1. Get the template</h4>
              <p className="text-xs text-muted-foreground">
                Download the Excel sheet with required columns.
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

          <form id="bulk-import-form" onSubmit={handleBulkUpload} className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">2. Upload completed file</h4>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 hover:bg-accent/5 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
                <FileSpreadsheet className="size-10 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-center">
                  {selectedFile ? selectedFile.name : "Click or drag Excel template here to upload"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
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
