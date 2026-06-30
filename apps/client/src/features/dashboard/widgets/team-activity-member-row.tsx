"use client";

import type { TeamActivityMemberDto } from "@kloqra/contracts";
import { ProjectColorDot, cn } from "@kloqra/ui";
import { DailyHoursSparkline } from "./daily-hours-sparkline";
import {
  formatDurationSec,
  formatTimeSince,
  formatWeekHours,
  memberInitials
} from "./team-activities-data";

type TeamActivityMemberRowProps = {
  member: TeamActivityMemberDto;
  periodTotalLabel: string;
  projectColor: string;
  timezone?: string;
};

function MemberAvatar({ name }: { name: string }) {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
      {memberInitials(name)}
    </div>
  );
}

function LatestActivityBlock({
  member,
  projectColor
}: {
  member: TeamActivityMemberDto;
  projectColor: string;
}) {
  const latest = member.latestActivity;
  if (!latest) {
    return <span className="text-muted-foreground">No activity</span>;
  }

  return (
    <div className="min-w-0 space-y-0.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <ProjectColorDot color={projectColor} size="sm" className="shrink-0" />
        <span className="truncate font-medium text-foreground">{latest.taskName}</span>
      </div>
      <p className="truncate text-[11px] text-muted-foreground">{latest.projectName}</p>
    </div>
  );
}

export function TeamActivityMemberCard({
  member,
  periodTotalLabel,
  projectColor,
  timezone
}: TeamActivityMemberRowProps) {
  const latest = member.latestActivity;

  return (
    <article className="rounded-lg border border-border/50 bg-muted/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <MemberAvatar name={member.userName} />
          <span className="truncate font-medium text-foreground">{member.userName}</span>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            {periodTotalLabel}
          </p>
          <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {formatWeekHours(member.periodTotalHours)}
          </p>
        </div>
      </div>

      <div className="mt-2.5 min-w-0">
        <LatestActivityBlock member={member} projectColor={projectColor} />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          <span className="font-medium text-foreground/80">Duration: </span>
          {latest ? formatDurationSec(latest.durationSec) : "—"}
        </span>
        <span>
          <span className="font-medium text-foreground/80">Time since: </span>
          {latest ? formatTimeSince(latest.endedAt) : "—"}
        </span>
      </div>

      <DailyHoursSparkline
        days={member.dailyHours}
        periodTotalHours={member.periodTotalHours}
        showCaption
        className="mt-3"
        timezone={timezone}
      />
    </article>
  );
}

const DESKTOP_GRID =
  "grid grid-cols-[minmax(6.5rem,0.9fr)_minmax(8rem,1.2fr)_3.25rem_4rem_3.25rem_minmax(9rem,1.4fr)] items-center gap-x-3";

export function TeamActivityMemberTableRow({
  member,
  projectColor,
  timezone
}: Omit<TeamActivityMemberRowProps, "periodTotalLabel">) {
  const latest = member.latestActivity;

  return (
    <div role="row" className={cn(DESKTOP_GRID, "py-3 text-xs")}>
      <div role="cell" className="flex min-w-0 items-center gap-2">
        <MemberAvatar name={member.userName} />
        <span className="truncate font-medium text-foreground">{member.userName}</span>
      </div>

      <div role="cell" className="min-w-0">
        <LatestActivityBlock member={member} projectColor={projectColor} />
      </div>

      <span role="cell" className="text-right font-mono tabular-nums text-foreground">
        {latest ? formatDurationSec(latest.durationSec) : "—"}
      </span>

      <span role="cell" className="text-[11px] text-muted-foreground">
        {latest ? formatTimeSince(latest.endedAt) : "—"}
      </span>

      <span role="cell" className="text-right font-mono font-semibold tabular-nums text-foreground">
        {formatWeekHours(member.periodTotalHours)}
      </span>

      <div role="cell">
        <DailyHoursSparkline
          days={member.dailyHours}
          periodTotalHours={member.periodTotalHours}
          timezone={timezone}
        />
      </div>
    </div>
  );
}

export const TEAM_ACTIVITY_DESKTOP_GRID = DESKTOP_GRID;
