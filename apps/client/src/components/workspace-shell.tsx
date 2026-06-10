"use client";

import { BRAND_NAME, ROUTES } from "@kloqra/contracts";
import type { AuthSessionDto, WorkspaceWithRoleDto } from "@kloqra/contracts";
import { Button, ResponsiveLayoutShell, SidebarUserFooter, type SidebarNavItem } from "@kloqra/ui";
import {
  applyDefaultWorkspaceIfNeeded,
  BrandMark,
  getAccessToken,
  logoutSession,
  ShellHeaderActions,
  tryRefreshSession,
  WorkspaceSwitcher
} from "@kloqra/web-shared";
import {
  CalendarDays,
  ClipboardCheck,
  Clock,
  FolderKanban,
  LayoutGrid,
  ListTodo,
  Timer as TimerIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMySubmissions } from "@/features/approvals/use-my-submissions";
import { api } from "@/lib/api";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

const baseNav = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
  { href: "/timer", label: "Timer", Icon: TimerIcon },
  { href: "/time-tracker", label: "Time Tracker", Icon: Clock },
  { href: "/timesheet", label: "Timesheet", Icon: CalendarDays },
  { href: "/approvals", label: "Approvals", Icon: ClipboardCheck },
  { href: "/projects", label: "My projects", Icon: FolderKanban },
  { href: "/tasks", label: "Tasks", Icon: ListTodo }
] as const;

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, setSession } = useSessionStore();
  const [anchorDate] = useState(() => new Date());
  const wsId = session?.workspaceId ?? "";
  const { actionableCount } = useMySubmissions(wsId, anchorDate, "assigned", Boolean(wsId));
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
      .then(async (s) => {
        const switched = await applyDefaultWorkspaceIfNeeded(s, token);
        setSession(switched.session, switched.accessToken);
        return api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, {
          workspaceId: switched.session.workspaceId
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
      let adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
      if (!adminUrl) {
        if (typeof window !== "undefined") {
          const host = window.location.hostname;
          if (host.includes("vercel.app")) {
            adminUrl = `https://${host.replace("-client", "-admin")}`;
          } else {
            adminUrl = "http://localhost:3002";
          }
        } else {
          adminUrl = "http://localhost:3002";
        }
      }
      window.location.href = `${adminUrl}/workspace`;
    }
  }

  const nav = useMemo((): readonly SidebarNavItem[] => {
    return baseNav.map((item) =>
      item.href === "/approvals" ? { ...item, badge: actionableCount } : item
    );
  }, [actionableCount]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BrandMark size="sm" iconOnly className="animate-pulse" />
          Loading workspace…
        </div>
      </div>
    );
  }

  return (
    <ResponsiveLayoutShell
      navItems={nav}
      logoIcon={<BrandMark size="md" iconOnly />}
      logoTitle={BRAND_NAME}
      logoSubtitle="Member Portal"
      logoLinkHref="/dashboard"
      shellToolbar={<ShellHeaderActions profileHref="/profile" settingsHref="/settings" />}
      impersonationBanner={
        session.impersonatorId ? (
          <div className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-6 py-3 text-xs text-amber-800 backdrop-blur-md dark:text-amber-300 lg:px-8">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
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
              className="h-7 border-amber-500/30 px-3 text-xs text-amber-900 transition-colors hover:bg-amber-500/20 dark:text-amber-200"
              onClick={handleStopImpersonation}
            >
              Return to Admin
            </Button>
          </div>
        ) : undefined
      }
      workspaceSwitcher={(collapsed) => (
        <WorkspaceSwitcher
          defaultRedirect="/dashboard"
          collapsed={collapsed}
          onAfterSwitch={() => {
            useProjectsStore.getState().setProjects([]);
            useProjectsStore.getState().setTasks([]);
          }}
        />
      )}
      footerContent={(collapsed) => (
        <SidebarUserFooter
          collapsed={collapsed}
          userName={session.user.name ?? "Member"}
          profileHref="/profile"
          onLogout={() => {
            void logoutSession(session.workspaceId).then(() => router.push("/login"));
          }}
        />
      )}
    >
      {children}
    </ResponsiveLayoutShell>
  );
}
