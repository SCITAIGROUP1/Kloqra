"use client";

import { AppBar, Badge, Button, EmptyState, ProjectNameWithColor } from "@kloqra/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ProjectDetailProvider, useProjectDetail } from "./project-detail-context";
import {
  ProjectDetailNav,
  resolveProjectDetailSection,
  type ProjectDetailSectionId
} from "./project-detail-nav";

const SECTION_COPY: Record<ProjectDetailSectionId, { title: string; description: string }> = {
  tasks: {
    title: "Tasks",
    description: "Define the task list members choose when logging time on this project."
  },
  team: {
    title: "Team",
    description: "Invite members and manage who can log time on this project."
  },
  settings: {
    title: "Settings",
    description: "Update project details, approval rules, and color."
  }
};

function ProjectDetailShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { project, loading, error } = useProjectDetail();
  const activeSection = resolveProjectDetailSection(pathname);
  const copy = SECTION_COPY[activeSection];

  if (loading) {
    return (
      <div className="space-y-6">
        <AppBar title="Project" description="Loading project details…" />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row">
          <div className="h-48 w-full animate-pulse rounded-xl bg-muted/50 lg:w-56" />
          <div className="h-64 flex-1 animate-pulse rounded-xl bg-muted/50" />
        </div>
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
      <AppBar
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            <ProjectNameWithColor
              name={project.name}
              color={project.color}
              className="text-2xl font-semibold tracking-tight"
            />
            <Badge variant={project.isActive ? "default" : "secondary"}>
              {project.isActive ? "Active" : "Inactive"}
            </Badge>
          </span>
        }
        description={
          project.clientName
            ? `Client: ${project.clientName}`
            : "Manage tasks, team members, and project settings."
        }
        actions={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-10 gap-1.5 border-border/80 bg-card shadow-none"
          >
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Projects
            </Link>
          </Button>
        }
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 rounded-xl border border-border bg-card p-3 shadow-sm lg:w-56">
          <ProjectDetailNav projectId={project.id} />
        </aside>

        <section className="min-w-0 flex-1 space-y-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{copy.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}

export function ProjectDetailShell({ children }: { children: ReactNode }) {
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
