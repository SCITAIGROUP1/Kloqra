"use client";

import { PROJECT_COLORS, ROUTES } from "@kloqra/contracts";
import type { ProjectSummaryDto } from "@kloqra/contracts";
import { MemberProjectColorPicker } from "@kloqra/ui";
import { ProjectOverviewStats } from "@kloqra/web-shared";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useMemberProjectDetail } from "./project-detail-context";
import { useIsImpersonating } from "@/hooks/use-is-impersonating";
import { api } from "@/lib/api";

export function MemberProjectOverview() {
  const { workspaceId, projectId, project, setProject } = useMemberProjectDetail();
  const [savingColor, setSavingColor] = useState(false);
  const isImpersonating = useIsImpersonating();

  const loadSummary = useCallback(
    async (from: string, to: string) => {
      const params = new URLSearchParams({ from, to });
      return api<ProjectSummaryDto>(
        `${ROUTES.REPORTING.PROJECT_SUMMARY(projectId)}?${params.toString()}`,
        { workspaceId }
      );
    },
    [workspaceId, projectId]
  );

  if (!project) return null;

  const displayColor = project.myColor ?? project.color;

  async function saveColor(color: string) {
    if (isImpersonating) return;
    setSavingColor(true);
    try {
      await api(ROUTES.USERS.PROJECT_COLOR(projectId), {
        method: "PUT",
        workspaceId,
        body: JSON.stringify({ color })
      });
      setProject({ ...project!, myColor: color });
      toast.success("Your project color was updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save color.");
    } finally {
      setSavingColor(false);
    }
  }

  async function clearColor() {
    if (isImpersonating) return;
    setSavingColor(true);
    try {
      await api(ROUTES.USERS.PROJECT_COLOR(projectId), {
        method: "DELETE",
        workspaceId
      });
      setProject({ ...project!, myColor: null });
      toast.success("Using the default project color.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset color.");
    } finally {
      setSavingColor(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
        <MemberProjectColorPicker
          value={displayColor}
          onChange={(color) => {
            if (!isImpersonating) void saveColor(color);
          }}
          colors={PROJECT_COLORS}
          onClear={!isImpersonating && project.myColor ? () => void clearColor() : undefined}
          disabled={isImpersonating || savingColor}
        />
      </div>
      <ProjectOverviewStats
        mode="member"
        loadSummary={loadSummary}
        projectInceptionDate={project.createdAt}
      />
    </div>
  );
}
