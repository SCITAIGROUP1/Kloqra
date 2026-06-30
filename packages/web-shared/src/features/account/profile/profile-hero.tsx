"use client";

import type { UserProfileDto } from "@kloqra/contracts";
import { Badge, UserAvatar } from "@kloqra/ui";
import { Briefcase, Mail } from "lucide-react";

export function ProfileHero({
  profile,
  workspaceRole,
  workspaceName
}: {
  profile: UserProfileDto;
  workspaceRole?: string;
  workspaceName?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex min-w-0 items-start gap-4">
        <UserAvatar
          name={profile.name}
          firstName={profile.firstName}
          lastName={profile.lastName}
          size="lg"
          className="rounded-2xl"
        />
        <div className="min-w-0 space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">{profile.name}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{profile.email}</span>
          </p>
          {profile.department ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Briefcase className="size-3.5 shrink-0" aria-hidden />
              {profile.department}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Active
            </Badge>
            {workspaceRole ? (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                {workspaceRole}
              </Badge>
            ) : null}
            {workspaceName ? (
              <Badge variant="outline" className="text-[10px] font-normal">
                {workspaceName}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
