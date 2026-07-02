"use client";

import { ROUTES } from "@kloqra/contracts";
import type { ProjectManagerLedProjectDto, ProjectManagerOverviewDto } from "@kloqra/contracts";
import {
  AppModal,
  Badge,
  Button,
  ConfirmDialog,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Table,
  TableBody,
  TableHeader,
  TableRow
} from "@kloqra/ui";
import { Briefcase } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function ProjectManagerAssignmentsDialog({
  manager,
  workspaceId,
  onClose,
  onChanged
}: {
  manager: ProjectManagerOverviewDto | null;
  workspaceId: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [demoteTarget, setDemoteTarget] = useState<ProjectManagerLedProjectDto | null>(null);

  async function demoteAssignment(project: ProjectManagerLedProjectDto) {
    if (!manager) return;
    setBusyId(project.teamMemberId);
    try {
      await api(ROUTES.PROJECTS.TEAM_MEMBER(project.projectId, project.teamMemberId), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({ role: "MEMBER" })
      });
      toast.success(`${manager.userName} is no longer project manager on ${project.projectName}.`);
      setDemoteTarget(null);
      await onChanged();
      if (manager.managedProjects.length <= 1) onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update assignment.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AppModal
        open={manager !== null}
        onOpenChange={(open) => !open && onClose()}
        title="Manage assignments"
        description={
          manager
            ? `Project manager roles for ${manager.userName}`
            : "Project manager roles for this manager"
        }
        icon={<Briefcase className="size-5" />}
        size="lg"
        footer={
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        }
      >
        {manager ? (
          manager.managedProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No project manager assignments.</p>
          ) : (
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Project</DataTableHead>
                  <DataTableHead>Assignment</DataTableHead>
                  <DataTableHead className="text-right">Actions</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {manager.managedProjects.map((project) => (
                  <TableRow key={project.teamMemberId}>
                    <DataTableCell className="font-medium">
                      <Link
                        href={`/projects/${project.projectId}/team`}
                        className="text-primary hover:underline"
                      >
                        {project.projectName}
                      </Link>
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={project.isActive ? "default" : "secondary"}>
                        {project.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busyId === project.teamMemberId}
                        onClick={() => setDemoteTarget(project)}
                      >
                        Demote to member
                      </Button>
                    </DataTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        ) : null}
      </AppModal>

      <ConfirmDialog
        open={demoteTarget !== null}
        title="Remove project manager role?"
        description={
          demoteTarget && manager
            ? `${manager.userName} will remain on ${demoteTarget.projectName} as a regular team member.`
            : undefined
        }
        confirmLabel="Demote to member"
        destructive
        onConfirm={() => demoteTarget && void demoteAssignment(demoteTarget)}
        onCancel={() => setDemoteTarget(null)}
      />
    </>
  );
}
