"use client";

import { ROUTES } from "@chronomint/contracts";
import type { AuthSessionDto, WorkspaceWithRoleDto } from "@chronomint/contracts";
import { Button, cn, ResponsiveLayoutShell } from "@chronomint/ui";
import {
  getAccessToken,
  logoutSession,
  ThemeToggle,
  tryRefreshSession,
  WorkspaceSwitcher
} from "@chronomint/web-shared";
import { CalendarDays, FolderKanban, ListTodo, LogOut, Timer as TimerIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

const nav = [
  { href: "/timer", label: "Timer", Icon: TimerIcon },
  { href: "/timesheet", label: "Timesheet", Icon: CalendarDays },
  { href: "/projects", label: "My projects", Icon: FolderKanban },
  { href: "/tasks", label: "Tasks", Icon: ListTodo }
] as const;

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, setSession } = useSessionStore();
  const setWorkspaceNames = useProjectsStore((s) => s.setWorkspaces);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);

  useEffect(() => {
    const isImpersonatingRequest =
      typeof window !== "undefined" && window.location.search.includes("impersonate=true");
    if (isImpersonatingRequest) {
      useSessionStore.getState().clear();
      const url = new URL(window.location.href);
      url.searchParams.delete("impersonate");
      window.history.replaceState({}, document.title, url.pathname + url.search);
    } else if (session) {
      return;
    }

    const token = getAccessToken();
    if (!token || isImpersonatingRequest) {
      tryRefreshSession()
        .then((newToken) => {
          if (!newToken) {
            router.replace("/login");
          }
        })
        .catch(() => {
          router.replace("/login");
        });
      return;
    }
    api<AuthSessionDto>(ROUTES.AUTH.ME)
      .then((s) => {
        setSession(s, token);
        return api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, {
          workspaceId: s.workspaceId
        });
      })
      .then((list) => {
        if (list) {
          setWorkspaces(list);
          setWorkspaceNames(list);
        }
      })
      .catch(() => router.replace("/login"));
  }, [session, setSession, setWorkspaces, setWorkspaceNames, router]);

  async function handleStopImpersonation() {
    try {
      await api(ROUTES.AUTH.STOP_IMPERSONATION, { method: "POST" });
    } catch {
      // Ignored
    } finally {
      useSessionStore.getState().clear();
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3002";
      window.location.href = `${adminUrl}/workspace`;
    }
  }

  async function logout() {
    await logoutSession(session?.workspaceId);
    router.push("/login");
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TimerIcon className="h-4 w-4 animate-pulse text-primary" />
          Loading workspace…
        </div>
      </div>
    );
  }

  return (
    <ResponsiveLayoutShell
      navItems={nav}
      logoIcon={<TimerIcon className="h-5 w-5" strokeWidth={2.25} />}
      logoTitle="ChronoMint"
      logoSubtitle={session.user.name}
      logoLinkHref="/timer"
      impersonationBanner={
        session.impersonatorId ? (
          <div className="sticky top-0 z-50 bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-md px-6 py-3 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span>
                Viewing workspace as <strong className="font-semibold">{session.user.name}</strong>{" "}
                (impersonated by Admin{" "}
                <strong className="font-semibold">{session.impersonatorName}</strong>)
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs border-amber-500/30 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 transition-colors"
              onClick={handleStopImpersonation}
            >
              Return to Admin
            </Button>
          </div>
        ) : undefined
      }
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
            defaultRedirect="/timer"
            collapsed={collapsed}
            onAfterSwitch={() => {
              useProjectsStore.getState().setProjects([]);
              useProjectsStore.getState().setTasks([]);
            }}
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
            onClick={() => void logout()}
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
