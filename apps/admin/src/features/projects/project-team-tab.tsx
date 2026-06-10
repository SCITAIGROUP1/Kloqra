"use client";

import { ROUTES } from "@kloqra/contracts";
import type { TeamInviteDto, TeamMemberDto } from "@kloqra/contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { buildTableQuery } from "@kloqra/web-shared";
import { useCallback, useEffect, useState } from "react";
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
  const [limit, setLimit] = useState(20);
  const [invite, setInvite] = useState<TeamInviteDto | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [creatingInvite, setCreatingInvite] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadTeam = useCallback(async () => {
    setLoadingTeam(true);
    try {
      const query = buildTableQuery(page, debouncedSearch);
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
      setLimit(data.limit);
    } catch {
      setTeamMeta(null);
      setMembers([]);
      setTotal(0);
      setTotalPages(0);
      toast.error("Could not load project team.");
    } finally {
      setLoadingTeam(false);
    }
  }, [workspaceId, projectId, page, debouncedSearch]);

  useEffect(() => {
    void loadTeam();
    setInvite(null);
  }, [loadTeam]);

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

  async function removeMember(member: TeamMemberDto) {
    if (!window.confirm(`Remove ${member.userName} from this project team?`)) return;
    setMemberBusyId(member.id);
    setError(null);
    try {
      await api(ROUTES.PROJECTS.TEAM_MEMBER(projectId, member.id), {
        method: "DELETE",
        workspaceId
      });
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

  const activeCount = members.filter(memberIsActive).length;

  return (
    <div className="space-y-6">
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Invite to team</CardTitle>
          <CardDescription>
            Members join the project team via this link (expires in 7 days).
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
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <Button type="button" onClick={createInviteLink} disabled={creatingInvite}>
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
                onClick={copyInvite}
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
          <p className="p-6 text-sm text-muted-foreground">
            No one on this team yet. Send an invite above.
          </p>
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
                          onClick={() => removeMember(m)}
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
              disabled={loadingTeam}
            />
          </>
        )}
      </DataTableCard>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
