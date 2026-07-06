"use client";

import { AppBar, Badge, Button, EmptyState, ProjectNameWithColor, Skeleton } from "@kloqra/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  MemberProjectDetailNav,
  resolveMemberProjectDetailSection,
  type MemberProjectDetailSectionId
} from "./member-project-detail-nav";
import { ProjectDetailProvider, useMemberProjectDetail } from "./project-detail-context";

const SECTION_COPY: Record<MemberProjectDetailSectionId, { title: string; description: string }> = {
  overview: {
    title: "Overview",
    description: "Your time on this project and personal display settings."
  },
  team: {
    title: "Team",
    description: "People assigned to this project."
  },
  tasks: {
    title: "Tasks",
    description: "Tasks you are assigned to on this project. Use these when logging time."
  }
};

function ProjectDetailShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { project, loading, error } = useMemberProjectDetail();
  const activeSection = resolveMemberProjectDetailSection(pathname);
  const copy = SECTION_COPY[activeSection];

  if (loading) {
    return (
      <div className="space-y-6">
        <AppBar title="Project" description="Loading project details…" />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row">
          <Skeleton className="h-48 w-full rounded-xl lg:w-56" />
          <Skeleton className="h-64 flex-1 rounded-xl" />
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

  const displayColor = project.myColor ?? project.color;

  return (
    <div className="space-y-6">
      <AppBar
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            <ProjectNameWithColor
              name={project.name}
              color={displayColor}
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
            : "View your stats and assigned tasks for this project."
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
          <MemberProjectDetailNav projectId={project.id} />
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

export function MemberProjectDetailShell({ children }: { children: ReactNode }) {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId ?? "";

  if (!projectId) {
    return (
      <EmptyState
        title="Invalid project"
        description="Choose a project from your list."
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
