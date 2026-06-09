"use client";

import { cn } from "@chronomint/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "tasks", label: "Tasks" },
  { segment: "team", label: "Team" },
  { segment: "settings", label: "Settings" }
] as const;

export function ProjectDetailTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border pb-px"
      aria-label="Project sections"
    >
      {TABS.map((tab) => {
        const href = `/projects/${projectId}/${tab.segment}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.segment}
            href={href}
            className={cn(
              "shrink-0 rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border border-b-transparent border-border bg-background text-foreground -mb-px"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
