"use client";

import { ROUTES, DEFAULT_TABLE_PAGE_SIZE } from "@kloqra/contracts";
import type { TeamInviteDto, TeamMemberDto, WorkspaceMemberDto } from "@kloqra/contracts";
import {
  AppModal,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  EmptyState,
  Input,
  Label,
  SearchableSelect,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow,
  TableToolbar,
  TableLoadingState
} from "@kloqra/ui";
import { buildTableQuery, extractFieldErrorsFromMessage } from "@kloqra/web-shared";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useProjectDetail } from "./project-detail-context";
import { api } from "@/lib/api";

function memberIsActive(m: TeamMemberDto): boolean {
  return m.isActive !== false;
}

export function ProjectTeamTab() {
  const { workspaceId, projectId } = useProjectDetail();
  const [teamMeta, setTeamMeta] = useState<{
    id: string;
    projectId: string;
    projectName: string;
  } | null>(null);
  const [members, setMembers] = useState<TeamMemberDto[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberDto[]>([]);
  const [loadingWorkspaceMembers, setLoadingWorkspaceMembers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMemberDto | null>(null);
  const [invite, setInvite] = useState<TeamInviteDto | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);

  const parsedValidation = error
    ? extractFieldErrorsFromMessage<"inviteEmail">(error, { inviteEmail: "Email" })
    : { fieldErrors: {}, formError: "" };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleLimitChange = useCallback((nextLimit: number) => {
    setPage(1);
    setLimit(nextLimit);
  }, []);

  const loadTeam = useCallback(async () => {
    setLoadingTeam(true);
    try {
      const query = buildTableQuery(page, debouncedSearch, undefined, limit);
      const data = await api<{
        id: string;
        projectId: string;
        projectName: string;
        members: TeamMemberDto[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      }>(`${ROUTES.PROJECTS.TEAM(projectId)}?${query}`, { workspaceId });
      setTeamMeta({ id: data.id, projectId: data.projectId, projectName: data.projectName });
      setMembers(data.members);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setTeamMeta(null);
      setMembers([]);
      setTotal(0);
      setTotalPages(0);
      toast.error("Could not load project team.");
    } finally {
      setLoadingTeam(false);
    }
  }, [workspaceId, projectId, page, debouncedSearch, limit]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const availableWorkspaceMembers = useMemo(() => {
    const onTeam = new Set(members.map((m) => m.userId));
    return workspaceMembers.filter((m) => !onTeam.has(m.userId));
  }, [workspaceMembers, members]);

  const selectedMember = useMemo(
    () => availableWorkspaceMembers.find((member) => member.userId === selectedUserId),
    [availableWorkspaceMembers, selectedUserId]
  );

  async function openAddModal() {
    setAddOpen(true);
    setSelectedUserId("");
    setLoadingWorkspaceMembers(true);
    try {
      const list = await api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(workspaceId), {
        workspaceId
      });
      setWorkspaceMembers(list);
    } catch {
      toast.error("Could not load workspace members.");
      setWorkspaceMembers([]);
    } finally {
      setLoadingWorkspaceMembers(false);
    }
  }

  async function addMember() {
    if (!selectedUserId) return;
    setAddingMember(true);
    setError(null);
    try {
      await api(ROUTES.PROJECTS.TEAM_MEMBERS(projectId), {
        method: "POST",
        workspaceId,
        body: JSON.stringify({ userId: selectedUserId })
      });
      setAddOpen(false);
      setSelectedUserId("");
      await loadTeam();
      toast.success("Member added to project team.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not add team member.";
      setError(message);
      toast.error(message);
    } finally {
      setAddingMember(false);
    }
  }

  async function setMemberActive(member: TeamMemberDto, isActive: boolean) {
    setMemberBusyId(member.id);
    setError(null);
    try {
      await api(ROUTES.PROJECTS.TEAM_MEMBER(projectId, member.id), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({ isActive })
      });
      await loadTeam();
      toast.success(isActive ? "Member activated." : "Member deactivated.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not update team member.";
      setError(message);
      toast.error(message);
    } finally {
      setMemberBusyId(null);
    }
  }

  async function createInviteLink() {
    setError(null);
    setCreatingInvite(true);
    try {
      const body = inviteEmail.trim() ? { email: inviteEmail.trim() } : {};
      const link = await api<TeamInviteDto>(ROUTES.PROJECTS.TEAM_INVITES(projectId), {
        method: "POST",
        workspaceId,
        body: JSON.stringify(body)
      });
      setInvite(link);
      toast.success("Invite link generated.");
    } catch {
      const message = "Could not create invite link.";
      setError(message);
      toast.error(message);
    } finally {
      setCreatingInvite(false);
    }
  }

  async function copyInvite() {
    if (!invite?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(invite.inviteUrl);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Could not copy invite link.");
    }
  }

  async function removeMember(member: TeamMemberDto) {
    setMemberBusyId(member.id);
    setError(null);
    try {
      await api(ROUTES.PROJECTS.TEAM_MEMBER(projectId, member.id), {
        method: "DELETE",
        workspaceId
      });
      setRemoveTarget(null);
      await loadTeam();
      toast.success(`${member.userName} removed from team.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not remove team member.";
      setError(message);
      toast.error(message);
    } finally {
      setMemberBusyId(null);
    }
  }

  const activeCount = members.filter(memberIsActive).length;

  return (
    <div className="space-y-6">
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Invite link (legacy)</CardTitle>
          <CardDescription>
            Optional fallback for members who cannot be added directly. Link expires in 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <Label htmlFor="invite-email">Email (optional)</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="member@example.com"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={Boolean(parsedValidation.fieldErrors.inviteEmail)}
            />
            {parsedValidation.fieldErrors.inviteEmail ? (
              <p className="text-xs text-destructive">{parsedValidation.fieldErrors.inviteEmail}</p>
            ) : null}
          </div>
          <Button type="button" onClick={() => void createInviteLink()} disabled={creatingInvite}>
            {creatingInvite ? "Generating…" : "Generate invite link"}
          </Button>
          {invite ? (
            <div className="max-w-2xl rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="break-all font-mono text-xs">{invite.inviteUrl}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => void copyInvite()}
              >
                Copy link
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <DataTableCard>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search team members…"
          searchAriaLabel="Search project team members"
          actions={
            <Button type="button" className="h-10" onClick={() => void openAddModal()}>
              Add team member
            </Button>
          }
        />
        <div className="border-b border-border/60 px-6 py-3">
          <p className="text-sm text-muted-foreground">
            {loadingTeam
              ? "Loading members…"
              : teamMeta
                ? `${teamMeta.projectName} · ${activeCount} active on this page`
                : "Team members"}
          </p>
        </div>
        {loadingTeam ? (
          <TableLoadingState rows={5} columns={4} />
        ) : members.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No one on this team yet"
              description="Add workspace members from Team Management, then assign them to this project."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" onClick={() => void openAddModal()}>
                    Add team member
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
                  <DataTableHead>Member</DataTableHead>
                  <DataTableHead>Email</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead className="text-right">Actions</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <DataTableCell className="font-medium">{m.userName}</DataTableCell>
                    <DataTableCell className="text-muted-foreground">{m.userEmail}</DataTableCell>
                    <DataTableCell>
                      <Badge variant={memberIsActive(m) ? "default" : "secondary"}>
                        {memberIsActive(m) ? "Active" : "Inactive"}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                          onClick={() => setRemoveTarget(m)}
                        >
                          Remove
                        </Button>
                      </div>
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
              onLimitChange={handleLimitChange}
              disabled={loadingTeam}
            />
          </>
        )}
      </DataTableCard>

      <AppModal
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setSelectedUserId("");
          }
        }}
        title="Add team member"
        description="Choose a workspace member to add to this project team."
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedUserId || addingMember || loadingWorkspaceMembers}
              onClick={() => void addMember()}
            >
              {addingMember ? "Adding…" : "Add member"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Label htmlFor="member-search">Workspace member</Label>
          {loadingWorkspaceMembers ? (
            <p className="text-sm text-muted-foreground">Loading members…</p>
          ) : availableWorkspaceMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No available members.{" "}
              <Link href="/team-management" className="text-primary hover:underline">
                Add members in Team Management
              </Link>
              .
            </p>
          ) : (
            <>
              <SearchableSelect
                id="member-search"
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                options={availableWorkspaceMembers.map((member) => ({
                  value: member.userId,
                  label: member.userName,
                  keywords: member.userEmail
                }))}
                placeholder="Select a workspace member"
                searchPlaceholder="Search by name or email…"
                emptyMessage="No members match your search."
                aria-label="Workspace member"
                contentClassName="z-[100]"
                renderOption={(option) => {
                  const member = availableWorkspaceMembers.find(
                    (item) => item.userId === option.value
                  );
                  return (
                    <span className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">{option.label}</span>
                      {member ? (
                        <span className="text-xs text-muted-foreground">{member.userEmail}</span>
                      ) : null}
                    </span>
                  );
                }}
              />
              {selectedMember ? (
                <p className="text-sm text-muted-foreground">
                  Selected:{" "}
                  <span className="font-medium text-foreground">{selectedMember.userName}</span> (
                  {selectedMember.userEmail})
                </p>
              ) : null}
            </>
          )}
        </div>
      </AppModal>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove from project team?"
        description={
          removeTarget
            ? `${removeTarget.userName} will lose access to this project but remain in the workspace.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (removeTarget) void removeMember(removeTarget);
        }}
        onCancel={() => setRemoveTarget(null)}
      />

      {error && parsedValidation.fieldErrors.inviteEmail ? (
        parsedValidation.formError ? (
          <p className="text-sm text-destructive">{parsedValidation.formError}</p>
        ) : null
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
