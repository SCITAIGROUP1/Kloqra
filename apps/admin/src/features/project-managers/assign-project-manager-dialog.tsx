"use client";

import { ROUTES } from "@kloqra/contracts";
import type { ProjectListItemDto, WorkspaceMemberDto } from "@kloqra/contracts";
import {
  AppModal,
  Button,
  Label,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { fetchListItems } from "@kloqra/web-shared";
import { UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type AssignProjectManagerDialogProps = {
  open: boolean;
  workspaceId: string;
  presetUserId?: string;
  onClose: () => void;
  onAssigned: () => Promise<void>;
};

export function AssignProjectManagerDialog({
  open,
  workspaceId,
  presetUserId,
  onClose,
  onAssigned
}: AssignProjectManagerDialogProps) {
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [projects, setProjects] = useState<ProjectListItemDto[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedUserId(presetUserId ?? "");
    setSelectedProjectId("");
  }, [open, presetUserId]);

  useEffect(() => {
    if (!open || !workspaceId) return;
    let cancelled = false;
    setLoadingOptions(true);
    void (async () => {
      try {
        const [memberRows, projectRows] = await Promise.all([
          api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(workspaceId), { workspaceId }),
          fetchListItems<ProjectListItemDto>(ROUTES.PROJECTS.LIST, { workspaceId })
        ]);
        if (!cancelled) {
          setMembers(memberRows.filter((member) => member.role === "MEMBER" && member.isActive));
          setProjects(projectRows.filter((project) => project.isActive));
        }
      } catch {
        if (!cancelled) {
          setMembers([]);
          setProjects([]);
          toast.error("Could not load members or projects.");
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, workspaceId]);

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        value: member.userId,
        label: member.userName,
        description: member.userEmail
      })),
    [members]
  );

  async function handleAssign() {
    if (!selectedUserId || !selectedProjectId) return;
    setSubmitting(true);
    try {
      let teamMemberId: string | null = null;
      try {
        const created = await api<{ id: string }>(ROUTES.PROJECTS.TEAM_MEMBERS(selectedProjectId), {
          method: "POST",
          workspaceId,
          body: JSON.stringify({ userId: selectedUserId })
        });
        teamMemberId = created.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (!message.toLowerCase().includes("already")) throw err;
        const team = await api<{ members: Array<{ id: string; userId: string }> }>(
          ROUTES.PROJECTS.TEAM(selectedProjectId),
          { workspaceId }
        );
        teamMemberId = team.members.find((member) => member.userId === selectedUserId)?.id ?? null;
        if (!teamMemberId) throw err;
      }

      await api(ROUTES.PROJECTS.TEAM_MEMBER(selectedProjectId, teamMemberId), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({ role: "PROJECT_MANAGER" })
      });

      const projectName =
        projects.find((project) => project.id === selectedProjectId)?.name ?? "project";
      toast.success(`Assigned as project manager on ${projectName}.`);
      onClose();
      await onAssigned();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign project manager.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Assign project manager"
      description="Promote a workspace member to project manager on a project."
      icon={<UserPlus className="size-5" />}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedUserId || !selectedProjectId || submitting || loadingOptions}
            onClick={() => void handleAssign()}
          >
            {submitting ? "Assigning…" : "Assign"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Workspace member</Label>
          <SearchableSelect
            value={selectedUserId}
            onValueChange={setSelectedUserId}
            options={memberOptions}
            placeholder={loadingOptions ? "Loading members…" : "Select member"}
            searchPlaceholder="Search members…"
            disabled={loadingOptions || Boolean(presetUserId)}
            aria-label="Select workspace member"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assign-project">Project</Label>
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
            disabled={loadingOptions}
          >
            <SelectTrigger id="assign-project" aria-label="Select project">
              <SelectValue placeholder={loadingOptions ? "Loading projects…" : "Select project"} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </AppModal>
  );
}
