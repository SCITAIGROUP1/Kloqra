"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@chronomint/ui";
import { ROUTES } from "@chronomint/contracts";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { AuthSessionDto, WorkspaceWithRoleDto } from "@chronomint/contracts";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/workspace", label: "Workspace" },
  { href: "/projects", label: "Projects" },
  { href: "/team", label: "Team Live" },
  { href: "/billing", label: "Billing" },
  { href: "/exports", label: "Exports" }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, setSession, clear } = useSessionStore();
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);

  useEffect(() => {
    if (session) {
      if (session.workspaceRole !== "ADMIN") router.replace("/login?error=admin");
      return;
    }
    const ws = getWorkspaceId();
    if (!ws) {
      router.replace("/login");
      return;
    }
    const token = localStorage.getItem("cm-access-token");
    if (!token) {
      router.replace("/login");
      return;
    }
    api<AuthSessionDto>(ROUTES.AUTH.ME, { workspaceId: ws })
      .then((s) => {
        if (s.workspaceRole !== "ADMIN") {
          router.replace("/login?error=admin");
          return;
        }
        setSession(s, token);
        return api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, { workspaceId: ws });
      })
      .then((list) => {
        if (list) setWorkspaces(list);
      })
      .catch(() => router.replace("/login"));
  }, [session, setSession, setWorkspaces, router]);

  if (!session) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-border bg-card p-4">
        <h1 className="font-bold text-primary">ChronoMint Admin</h1>
        <WorkspaceSwitcher />
        <nav className="mt-6 flex flex-col gap-0.5">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Button className="mt-8" variant="secondary" size="sm" onClick={() => { clear(); router.push("/login"); }}>
          Logout
        </Button>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
