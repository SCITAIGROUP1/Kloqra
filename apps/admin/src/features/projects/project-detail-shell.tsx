"use client";

import { Badge, Button, EmptyState, ProjectNameWithColor } from "@chronomint/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProjectDetailProvider, useProjectDetail } from "./project-detail-context";
import { ProjectDetailTabs } from "./project-detail-tabs";

function ProjectDetailShellInner({ children }: { children: React.ReactNode }) {
  const { project, loading, error } = useProjectDetail();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <EmptyState
        title="Project not found"
        description={error ?? "This project may have been removed or you lack access."}
        action={
          <Button asChild variant="outline">
            <Link href="/projects">Back to projects</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 gap-1.5 px-2 text-muted-foreground"
        >
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Projects
          </Link>
        </Button>

        <div className="space-y-1.5 border-b border-border pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <ProjectNameWithColor
              name={project.name}
              color={project.color}
              className="text-2xl font-semibold tracking-tight"
            />
            <Badge variant={project.isActive ? "default" : "secondary"}>
              {project.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {project.clientName
              ? `Client: ${project.clientName}`
              : "Manage tasks, team members, and project settings."}
          </p>
        </div>

        <ProjectDetailTabs projectId={project.id} />
      </div>

      <div>{children}</div>
    </div>
  );
}

export function ProjectDetailShell({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = typeof params.projectId === "string" ? params.projectId : "";

  if (!projectId) {
    return (
      <EmptyState
        title="Invalid project"
        description="Choose a project from the workspace list."
        action={
          <Button asChild variant="outline">
            <Link href="/projects">View projects</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ProjectDetailProvider projectId={projectId}>
      <ProjectDetailShellInner>{children}</ProjectDetailShellInner>
    </ProjectDetailProvider>
  );
}
