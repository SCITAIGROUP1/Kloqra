"use client";

import type { ProjectManagerOverviewDto } from "@kloqra/contracts";
import { AppModal, Badge, Button } from "@kloqra/ui";
import { User } from "lucide-react";
import Link from "next/link";
import { formatLastActive, formatWeekHours } from "../team-management/format-last-active";

export function ProjectManagerProfileDialog({
  manager,
  onClose
}: {
  manager: ProjectManagerOverviewDto | null;
  onClose: () => void;
}) {
  return (
    <AppModal
      open={manager !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Project manager profile"
      description="Workspace member with project manager assignments"
      icon={<User className="size-5" />}
      size="lg"
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {manager ? (
        <div className="space-y-5">
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="text-right font-medium">{manager.userName}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-right">{manager.userEmail}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Workspace status</dt>
              <dd>
                <Badge variant={manager.isWorkspaceMemberActive ? "default" : "secondary"}>
                  {manager.isWorkspaceMemberActive ? "Active" : "Inactive"}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Activity</dt>
              <dd className="capitalize">{manager.status}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Projects led</dt>
              <dd>{manager.managedProjectCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Hours this week</dt>
              <dd>{formatWeekHours(manager.weekHours)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Last active</dt>
              <dd>{formatLastActive(manager.lastActiveAt, manager.isTrackingNow)}</dd>
            </div>
          </dl>

          {manager.managedProjects.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Led projects</p>
              <ul className="space-y-2 rounded-lg border bg-muted/20 p-3 text-sm">
                {manager.managedProjects.map((project) => (
                  <li
                    key={project.teamMemberId}
                    className="flex items-center justify-between gap-3"
                  >
                    <Link
                      href={`/projects/${project.projectId}/team`}
                      className="font-medium text-primary hover:underline"
                    >
                      {project.projectName}
                    </Link>
                    <Badge variant={project.isActive ? "default" : "secondary"}>
                      {project.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </AppModal>
  );
}
