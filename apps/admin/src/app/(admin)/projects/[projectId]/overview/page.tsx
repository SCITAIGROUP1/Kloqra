"use client";

import { useParams } from "next/navigation";
import { ProjectOverviewTab } from "@/features/projects/project-overview-tab";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export default function ProjectOverviewPage() {
  const params = useParams<{ projectId: string }>();
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";

  return <ProjectOverviewTab workspaceId={ws} projectId={params.projectId} />;
}
