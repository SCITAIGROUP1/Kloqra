"use client";

import { Badge, cn } from "@kloqra/ui";
import { Pause, Play } from "lucide-react";
import { formatLastActive } from "../team-management/format-last-active";
import { formatElapsedTimer, memberInitials, type TeamLiveMember } from "./team-live-status";

const STATUS_BADGE: Record<
  TeamLiveMember["status"],
  { label: string; className: string; Icon?: typeof Play }
> = {
  active: {
    label: "Active",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    Icon: Play
  },
  idle: {
    label: "Idle",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
  },
  break: {
    label: "Break",
    className:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-300",
    Icon: Pause
  },
  offline: {
    label: "Offline",
    className: "border-border bg-muted/40 text-muted-foreground"
  }
};

export function TeamLiveMemberCard({ member, now }: { member: TeamLiveMember; now: number }) {
  const badge = STATUS_BADGE[member.status];
  const BadgeIcon = badge.Icon;
  const isTracking = member.status === "active" || member.status === "break";

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
            {memberInitials(member.userName)}
          </div>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{member.userName}</h3>
              <Badge
                variant="outline"
                className={cn("gap-1 px-2 py-0 text-[11px] font-medium", badge.className)}
              >
                {BadgeIcon ? <BadgeIcon className="size-3" aria-hidden /> : null}
                {badge.label}
              </Badge>
            </div>
          </div>
        </div>

        {isTracking && member.startedAt ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums",
              member.status === "break"
                ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-300"
                : "border-primary/15 bg-primary/5 text-primary"
            )}
          >
            {member.status === "active" ? (
              <Play className="size-3 stroke-[2.5]" aria-hidden />
            ) : (
              <Pause className="size-3 stroke-[2.5]" aria-hidden />
            )}
            {member.status === "break" ? "Paused" : formatElapsedTimer(member.startedAt, now)}
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {isTracking ? (
          <>
            <div>
              <p className="text-xs text-muted-foreground">Current Project</p>
              <p className="mt-0.5 text-sm font-medium">{member.projectName || "No project"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Task</p>
              <p className="mt-0.5 text-sm font-medium">{member.taskName || "General work"}</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Last active: {formatLastActive(member.lastActiveAt, false)}
          </p>
        )}
      </div>
    </article>
  );
}
