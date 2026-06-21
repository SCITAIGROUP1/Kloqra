"use client";

import type { ProjectDto } from "@kloqra/contracts";
import { Badge, ProjectColorDot, cn } from "@kloqra/ui";
import { Briefcase, Users } from "lucide-react";
import type { ScopeMember } from "./export-scope-filters";
import { buildExportScopeSummary, type ExportScopeSummaryInput } from "@/lib/export-scope-summary";

type ExportAppliedScopeSummaryProps = ExportScopeSummaryInput & {
  projects: Pick<ProjectDto, "id" | "name" | "color">[];
  members: ScopeMember[];
  previewLoading?: boolean;
  className?: string;
  compact?: boolean;
};

function ScopeRow({
  icon: Icon,
  label,
  value,
  accent,
  projectColor
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
  accent?: boolean;
  projectColor?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon
        className={cn("mt-0.5 size-4 shrink-0", accent ? "text-primary" : "text-muted-foreground")}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="flex min-w-0 items-center gap-1.5 break-words text-sm font-semibold text-foreground">
          {projectColor ? <ProjectColorDot color={projectColor} className="shrink-0" /> : null}
          <span className="min-w-0">{value}</span>
        </p>
      </div>
    </div>
  );
}

export function ExportAppliedScopeSummary({
  projectIds,
  userIds,
  projectNames,
  userNames,
  categoryName,
  taskName,
  teamOnly,
  projects,
  members,
  previewLoading = false,
  className,
  compact = false
}: ExportAppliedScopeSummaryProps) {
  const resolvedProjectNames =
    projectNames ??
    projectIds
      .map((id) => projects.find((project) => project.id === id)?.name)
      .filter((name): name is string => Boolean(name));

  const resolvedUserNames =
    userNames ??
    userIds
      .map((id) => members.find((member) => member.userId === id)?.userName)
      .filter((name): name is string => Boolean(name));

  const summary = buildExportScopeSummary({
    projectIds,
    userIds,
    projectNames: resolvedProjectNames,
    userNames: resolvedUserNames,
    categoryName,
    taskName,
    teamOnly
  });

  const singleProjectColor =
    projectIds.length === 1
      ? projects.find((project) => project.id === projectIds[0])?.color
      : undefined;

  const statusLabel = previewLoading
    ? "Updating preview…"
    : summary.isWorkspaceWide
      ? "Whole workspace"
      : "Scoped export";

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 transition-colors",
        previewLoading
          ? "border-primary/20 bg-background/70"
          : summary.isWorkspaceWide
            ? "border-border/70 bg-muted/20"
            : "border-primary/30 bg-background/90",
        !compact && "ring-1 ring-primary/10",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3",
          compact ? "gap-2" : "sm:flex-row sm:items-start sm:justify-between"
        )}
      >
        <div
          className={cn("grid min-w-0 flex-1 gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2")}
        >
          <ScopeRow
            icon={Briefcase}
            label="Projects"
            value={summary.projectsLabel}
            accent={projectIds.length > 0}
            projectColor={singleProjectColor}
          />
          <ScopeRow
            icon={Users}
            label="Members"
            value={summary.membersLabel}
            accent={userIds.length > 0}
          />
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "w-fit shrink-0 font-normal",
            previewLoading
              ? "border-primary/20 bg-primary/10"
              : summary.isWorkspaceWide
                ? "border-border bg-muted/40"
                : "border-primary/30 bg-primary/15"
          )}
        >
          {statusLabel}
        </Badge>
      </div>

      {summary.extras.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/50 pt-3">
          {summary.extras.map((extra) => (
            <Badge key={extra} variant="outline" className="font-normal">
              {extra}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
