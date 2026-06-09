"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@chronomint/ui";
import { useProjectDetail } from "./project-detail-context";
import { ProjectTasksPanel } from "./project-tasks-panel";

export function ProjectTasksTab() {
  const { workspaceId, projectId } = useProjectDetail();

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Tasks</CardTitle>
        <CardDescription>
          Define the task list members choose when logging time on this project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProjectTasksPanel workspaceId={workspaceId} projectId={projectId} />
      </CardContent>
    </Card>
  );
}
