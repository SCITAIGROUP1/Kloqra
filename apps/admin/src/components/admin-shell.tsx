"use client";

import { ROUTES } from "@chronomint/contracts";
import type { AuthSessionDto, WorkspaceWithRoleDto } from "@chronomint/contracts";
import { Button, cn, ResponsiveLayoutShell } from "@chronomint/ui";
import {
  getAccessToken,
  logoutSession,
  ThemeToggle,
  WorkspaceSwitcher
} from "@chronomint/web-shared";
import {
  Building2,
  CreditCard,
  Download,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Tags,
  Timer,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

const nav = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/workspace", label: "Workspace", Icon: Building2 },
  { href: "/categories", label: "Categories", Icon: Tags },
  { href: "/projects", label: "Projects", Icon: FolderKanban },
  { href: "/team", label: "Team Live", Icon: Users },
  { href: "/billing", label: "Billing", Icon: CreditCard },
  { href: "/exports", label: "Exports", Icon: Download }
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, setSession } = useSessionStore();
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);

  useEffect(() => {
    if (session) {
      if (session.workspaceRole !== "ADMIN") router.replace("/login?error=admin");
      return;
    }
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    api<AuthSessionDto>(ROUTES.AUTH.ME)
      .then((s) => {
        if (s.workspaceRole !== "ADMIN") {
          router.replace("/login?error=admin");
          return;
        }
        setSession(s, token);
        return api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, {
          workspaceId: s.workspaceId
        });
      })
      .then((list) => {
        if (list) setWorkspaces(list);
      })
      .catch(() => router.replace("/login"));
  }, [session, setSession, setWorkspaces, router]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="h-4 w-4 animate-pulse text-primary" />
          Loading workspace…
        </div>
      </div>
    );
  }

  return (
    <ResponsiveLayoutShell
      navItems={nav}
      logoIcon={<Timer className="h-5 w-5" strokeWidth={2.25} />}
      logoTitle="ChronoMint"
      logoSubtitle="Admin console"
      logoLinkHref="/dashboard"
      workspaceSwitcher={(collapsed) => (
        <div
          className={cn(
            "rounded-xl border border-border/70 bg-muted/25 transition-all duration-300",
            collapsed ? "p-1.5 border-none bg-transparent" : "p-3"
          )}
        >
          {!collapsed && (
            <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Workspace
            </p>
          )}
          <WorkspaceSwitcher
            filterRole="ADMIN"
            defaultRedirect="/dashboard"
            collapsed={collapsed}
          />
        </div>
      )}
      footerContent={(collapsed) => (
        <div
          className={cn(
            "rounded-xl border border-border/70 bg-muted/25 transition-all duration-300 space-y-3",
            collapsed ? "p-1.5 border-none bg-transparent" : "p-3"
          )}
        >
          <div>
            {!collapsed && (
              <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Appearance
              </p>
            )}
            <ThemeToggle collapsed={collapsed} />
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "transition-all duration-300",
              collapsed ? "h-9 w-9 p-0 mx-auto justify-center" : "w-full justify-start gap-2"
            )}
            title={collapsed ? "Log out" : undefined}
            onClick={() => {
              void logoutSession(session.workspaceId).then(() => router.push("/login"));
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {!collapsed && <span>Log out</span>}
          </Button>
        </div>
      )}
    >
      {children}
    </ResponsiveLayoutShell>
  );
}
