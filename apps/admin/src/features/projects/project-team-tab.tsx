"use client";

import { ROUTES } from "@chronomint/contracts";
import type { TeamDto, TeamInviteDto, TeamMemberDto } from "@chronomint/contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@chronomint/ui";
import { useEffect, useState } from "react";
import { useProjectDetail } from "./project-detail-context";
import { api } from "@/lib/api";

function memberIsActive(m: TeamMemberDto): boolean {
  return m.isActive !== false;
}

export function ProjectTeamTab() {
  const { workspaceId, projectId } = useProjectDetail();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [invite, setInvite] = useState<TeamInviteDto | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);

  useEffect(() => {
    setLoadingTeam(true);
    api<TeamDto>(ROUTES.PROJECTS.TEAM(projectId), { workspaceId })
      .then(setTeam)
      .catch(() => setTeam(null))
      .finally(() => setLoadingTeam(false));
    setInvite(null);
  }, [workspaceId, projectId]);

  async function setMemberActive(member: TeamMemberDto, isActive: boolean) {
    setMemberBusyId(member.id);
    setError(null);
    try {
      await api(ROUTES.PROJECTS.TEAM_MEMBER(projectId, member.id), {
        method: "PATCH",
        workspaceId,
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
    if (!window.confirm(`Remove ${member.userName} from this project team?`)) return;
    setMemberBusyId(member.id);
    setError(null);
    try {
      await api(ROUTES.PROJECTS.TEAM_MEMBER(projectId, member.id), {
        method: "DELETE",
        workspaceId
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
    setError(null);
    try {
      const body = inviteEmail.trim() ? { email: inviteEmail.trim() } : {};
      const link = await api<TeamInviteDto>(ROUTES.PROJECTS.TEAM_INVITES(projectId), {
        method: "POST",
        workspaceId,
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

  const activeCount = team?.members.filter(memberIsActive).length ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Invite to team</CardTitle>
          <CardDescription>
            Members join the project team via this link (expires in 7 days).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-md">
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
            <div className="rounded-lg border bg-muted/30 p-4 text-sm max-w-2xl">
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

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Team members</CardTitle>
          <CardDescription>
            {loadingTeam
              ? "Loading members…"
              : `${activeCount} active · ${(team?.members.length ?? 0) - activeCount} inactive`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTeam ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !team || team.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one on this team yet. Send an invite above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.userName}</TableCell>
                    <TableCell className="text-muted-foreground">{m.userEmail}</TableCell>
                    <TableCell>
                      <Badge variant={memberIsActive(m) ? "default" : "secondary"}>
                        {memberIsActive(m) ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
