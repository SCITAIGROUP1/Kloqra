"use client";

import { useProjectDetail } from "./project-detail-context";
import { ProjectTasksPanel } from "./project-tasks-panel";

export function ProjectTasksTab() {
  const { workspaceId, projectId, project } = useProjectDetail();
  const projectIsActive = project?.isActive ?? true;

  return (
    <ProjectTasksPanel
      workspaceId={workspaceId}
      projectId={projectId}
      projectIsActive={projectIsActive}
    />
  );
}
