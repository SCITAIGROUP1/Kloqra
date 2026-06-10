"use client";

import { cn } from "@kloqra/ui";
import { ChevronRight, ListTodo, Settings, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type ProjectDetailSectionId = "tasks" | "team" | "settings";

export type ProjectDetailNavItem = {
  id: ProjectDetailSectionId;
  label: string;
  icon: LucideIcon;
  href: string;
};

const DEFAULT_ITEMS: Omit<ProjectDetailNavItem, "href">[] = [
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "team", label: "Team", icon: Users },
  { id: "settings", label: "Settings", icon: Settings }
];

export function buildProjectDetailNavItems(projectId: string): ProjectDetailNavItem[] {
  return DEFAULT_ITEMS.map((item) => ({
    ...item,
    href: `/projects/${projectId}/${item.id}`
  }));
}

export function resolveProjectDetailSection(pathname: string): ProjectDetailSectionId {
  if (pathname.includes("/team")) return "team";
  if (pathname.includes("/settings")) return "settings";
  return "tasks";
}

export function ProjectDetailNav({
  projectId,
  items = buildProjectDetailNavItems(projectId)
}: {
  projectId: string;
  items?: ProjectDetailNavItem[];
}) {
  const pathname = usePathname();
  const active = resolveProjectDetailSection(pathname);

  return (
    <nav className="flex flex-col gap-1" aria-label="Project sections">
      {items.map(({ id, label, icon: Icon, href }) => {
        const isActive = active === id;
        return (
          <Link
            key={id}
            href={href}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">{label}</span>
            {isActive ? <ChevronRight className="size-4 shrink-0" aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
