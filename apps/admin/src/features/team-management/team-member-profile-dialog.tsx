"use client";

import type { TeamMemberOverviewDto } from "@kloqra/contracts";
import { AppModal, Badge, Button } from "@kloqra/ui";
import { User } from "lucide-react";
import { formatLastActive, formatWeekHours } from "./format-last-active";

function roleLabel(role: "ADMIN" | "MEMBER"): string {
  return role === "ADMIN" ? "Admin" : "Member";
}

export function TeamMemberProfileDialog({
  member,
  onClose
}: {
  member: TeamMemberOverviewDto | null;
  onClose: () => void;
}) {
  return (
    <AppModal
      open={member !== null}
      onOpenChange={(open) => !open && onClose()}
      title="View profile"
      description="Workspace member overview"
      icon={<User className="size-5" />}
      size="lg"
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {member ? (
        <dl className="grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium text-right">{member.userName}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-right">{member.userEmail}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Role</dt>
            <dd>
              <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
                {roleLabel(member.role)}
              </Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">{member.status}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Projects</dt>
            <dd>{member.projectCount}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Hours this week</dt>
            <dd>{formatWeekHours(member.weekHours)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Last active</dt>
            <dd>{formatLastActive(member.lastActiveAt, member.isTrackingNow)}</dd>
          </div>
        </dl>
      ) : null}
    </AppModal>
  );
}
