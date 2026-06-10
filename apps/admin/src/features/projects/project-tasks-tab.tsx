"use client";

import { useProjectDetail } from "./project-detail-context";
import { ProjectTasksPanel } from "./project-tasks-panel";

export function ProjectTasksTab() {
  const { workspaceId, projectId } = useProjectDetail();

  return <ProjectTasksPanel workspaceId={workspaceId} projectId={projectId} />;
}
