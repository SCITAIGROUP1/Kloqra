"use client";

import type { WorkspaceAdminOverviewDto } from "@kloqra/contracts";
import { AppModal, Badge, Button } from "@kloqra/ui";
import { User } from "lucide-react";
import { formatLastActive, formatWeekHours } from "@/features/team-management/format-last-active";

export function WorkspaceAdminProfileDialog({
  admin,
  onClose
}: {
  admin: WorkspaceAdminOverviewDto | null;
  onClose: () => void;
}) {
  return (
    <AppModal
      open={admin !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Workspace admin profile"
      description="Workspace administrator details"
      icon={<User className="size-5" />}
      size="lg"
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {admin ? (
        <dl className="grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="text-right font-medium">{admin.userName}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-right">{admin.userEmail}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Workspace</dt>
            <dd className="text-right">{admin.workspaceName}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge variant={admin.isActive ? "default" : "secondary"}>
                {admin.isActive ? "Active" : "Inactive"}
              </Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Activity</dt>
            <dd className="capitalize">{admin.status}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Hours this week</dt>
            <dd>{formatWeekHours(admin.weekHours)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Last active</dt>
            <dd>{formatLastActive(admin.lastActiveAt, admin.isTrackingNow)}</dd>
          </div>
        </dl>
      ) : null}
    </AppModal>
  );
}
