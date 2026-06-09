"use client";

import { ROUTES } from "@chronomint/contracts";
import type { ProjectDto } from "@chronomint/contracts";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

type ProjectDetailContextValue = {
  workspaceId: string;
  projectId: string;
  project: ProjectDto | null;
  loading: boolean;
  error: string | null;
  refreshProject: () => Promise<void>;
  setProject: (project: ProjectDto) => void;
};

const ProjectDetailContext = createContext<ProjectDetailContextValue | null>(null);

export function ProjectDetailProvider({
  projectId,
  children
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProject = useCallback(async () => {
    if (!ws || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<ProjectDto>(ROUTES.PROJECTS.BY_ID(projectId), { workspaceId: ws });
      setProject(data);
    } catch {
      setError("Could not load project.");
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [ws, projectId]);

  useEffect(() => {
    void refreshProject();
  }, [refreshProject]);

  const value = useMemo(
    () => ({
      workspaceId: ws,
      projectId,
      project,
      loading,
      error,
      refreshProject,
      setProject
    }),
    [ws, projectId, project, loading, error, refreshProject]
  );

  return <ProjectDetailContext.Provider value={value}>{children}</ProjectDetailContext.Provider>;
}

export function useProjectDetail() {
  const ctx = useContext(ProjectDetailContext);
  if (!ctx) {
    throw new Error("useProjectDetail must be used within ProjectDetailProvider");
  }
  return ctx;
}
