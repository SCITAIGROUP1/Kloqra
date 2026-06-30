"use client";

import { DEFAULT_PROJECT_COLOR } from "@kloqra/contracts";
import type { ProjectDto, TeamActivitiesDto } from "@kloqra/contracts";
import { CenteredLoader, EmptyState } from "@kloqra/ui";
import type { DashboardPeriodSelection } from "@kloqra/web-shared";
import { useMemo } from "react";
import {
  countActiveTeamActivityFilters,
  teamActivitiesPeriodTotalLabel,
  type TeamActivitiesFilters
} from "./team-activities-data";
import {
  TEAM_ACTIVITY_DESKTOP_GRID,
  TeamActivityMemberCard,
  TeamActivityMemberTableRow
} from "./team-activity-member-row";

export type TeamActivitiesWidgetProps = {
  data: TeamActivitiesDto | null;
  projects: ProjectDto[];
  loading?: boolean;
  error?: string | null;
  range: DashboardPeriodSelection;
  filters: TeamActivitiesFilters;
  timezone?: string;
};

function resolveProjectColor(projectId: string, projectColorById: Map<string, string>): string {
  return projectColorById.get(projectId) ?? DEFAULT_PROJECT_COLOR;
}

export function TeamActivitiesWidget({
  data,
  projects,
  loading,
  error,
  range,
  filters,
  timezone
}: TeamActivitiesWidgetProps) {
  const periodTotalLabel = teamActivitiesPeriodTotalLabel(range);
  const activeFilterCount = countActiveTeamActivityFilters(filters);

  const projectColorById = useMemo(
    () =>
      new Map(
        projects.map((project) => [
          project.id,
          project.myColor ?? project.color ?? DEFAULT_PROJECT_COLOR
        ])
      ),
    [projects]
  );

  if (loading) {
    return <CenteredLoader label="Loading team activities…" />;
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load team activities"
        description="The team activity feed failed to load. Try refreshing the page — if you recently updated the app, restart the API server."
      />
    );
  }

  if (!data || data.members.length === 0) {
    return (
      <EmptyState
        title="No team activity in this period"
        description={
          activeFilterCount > 0
            ? "Try widening the date range or clearing project, category, or task filters."
            : "When teammates log time in the selected period, their entries will appear here."
        }
      />
    );
  }

  return (
    <div className="@container flex min-h-[220px] flex-col overflow-hidden">
      <p className="mb-3 text-[11px] text-muted-foreground">
        Respects your dashboard period
        {activeFilterCount > 0 ? " and scope filters" : ""}. Bar height shows daily hours — hover
        for exact values. Today is highlighted.
      </p>

      <div
        className="hidden min-h-0 flex-1 flex-col @min-[700px]:flex"
        role="table"
        aria-label="Team activities"
      >
        <div className="min-h-0 flex-1 overflow-x-auto">
          <div className="min-w-0 @min-[700px]:min-w-[36rem] @min-[900px]:min-w-[48rem]">
            <div
              role="row"
              className={`${TEAM_ACTIVITY_DESKTOP_GRID} pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`}
            >
              <span role="columnheader">Member</span>
              <span role="columnheader">Latest activity</span>
              <span role="columnheader" className="text-right">
                Duration
              </span>
              <span role="columnheader">Time since</span>
              <span role="columnheader" className="text-right">
                {periodTotalLabel}
              </span>
              <span role="columnheader" title="Bar height = hours logged that day">
                Hours by day
              </span>
            </div>

            <div className="divide-y divide-border/40" role="rowgroup">
              {data.members.map((member) => (
                <TeamActivityMemberTableRow
                  key={member.userId}
                  member={member}
                  projectColor={
                    member.latestActivity
                      ? resolveProjectColor(member.latestActivity.projectId, projectColorById)
                      : "var(--muted)"
                  }
                  timezone={timezone}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 @min-[700px]:hidden">
        {data.members.map((member) => (
          <TeamActivityMemberCard
            key={member.userId}
            member={member}
            periodTotalLabel={periodTotalLabel}
            projectColor={
              member.latestActivity
                ? resolveProjectColor(member.latestActivity.projectId, projectColorById)
                : "var(--muted)"
            }
            timezone={timezone}
          />
        ))}
      </div>
    </div>
  );
}

export default TeamActivitiesWidget;
