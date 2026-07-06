"use client";

import { cn } from "@kloqra/ui";
import { BarChart3, ChevronRight, ListTodo, Users2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type MemberProjectDetailSectionId = "overview" | "team" | "tasks";

export type MemberProjectDetailNavItem = {
  id: MemberProjectDetailSectionId;
  label: string;
  icon: LucideIcon;
  href: string;
};

const DEFAULT_ITEMS: Omit<MemberProjectDetailNavItem, "href">[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "team", label: "Team", icon: Users2 },
  { id: "tasks", label: "Tasks", icon: ListTodo }
];

export function buildMemberProjectDetailNavItems(projectId: string): MemberProjectDetailNavItem[] {
  return DEFAULT_ITEMS.map((item) => ({
    ...item,
    href: `/projects/${projectId}/${item.id}`
  }));
}

export function resolveMemberProjectDetailSection(pathname: string): MemberProjectDetailSectionId {
  if (pathname.includes("/tasks")) return "tasks";
  if (pathname.includes("/team")) return "team";
  return "overview";
}

export function MemberProjectDetailNav({
  projectId,
  items = buildMemberProjectDetailNavItems(projectId)
}: {
  projectId: string;
  items?: MemberProjectDetailNavItem[];
}) {
  const pathname = usePathname();
  const active = resolveMemberProjectDetailSection(pathname);

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
