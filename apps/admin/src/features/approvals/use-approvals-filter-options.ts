"use client";

import { ROUTES } from "@kloqra/contracts";
import type { ProjectListItemDto, TeamMembersOverviewDto } from "@kloqra/contracts";
import { fetchListItems } from "@kloqra/web-shared";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

export type ApprovalsFilterOption = {
  value: string;
  label: string;
};

export function useApprovalsFilterOptions(workspaceId: string, enabled = true) {
  const [projects, setProjects] = useState<ProjectListItemDto[]>([]);
  const [members, setMembers] = useState<ApprovalsFilterOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    setLoading(true);
    void Promise.all([
      fetchListItems<ProjectListItemDto>(ROUTES.PROJECTS.LIST, { workspaceId }),
      api<TeamMembersOverviewDto>(
        `${ROUTES.WORKSPACES.MEMBERS_OVERVIEW(workspaceId)}?page=1&limit=100`,
        { workspaceId }
      )
    ])
      .then(([projectRows, overview]) => {
        setProjects(projectRows.filter((p) => p.timesheetApprovalEnabled && p.isActive));
        setMembers(
          (overview.members ?? []).map((member) => ({
            value: member.userId,
            label: member.userName
          }))
        );
      })
      .catch(() => {
        setProjects([]);
        setMembers([]);
      })
      .finally(() => setLoading(false));
  }, [enabled, workspaceId]);

  const projectOptions = useMemo(
    (): ApprovalsFilterOption[] =>
      projects
        .map((project) => ({ value: project.id, label: project.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [projects]
  );

  return { projectOptions, memberOptions: members, loading };
}
