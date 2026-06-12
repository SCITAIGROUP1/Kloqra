"use client";

import { BRAND_NAME, ROUTES } from "@kloqra/contracts";
import { Button, ResponsiveLayoutShell, SidebarUserFooter, type SidebarNavItem } from "@kloqra/ui";
import {
  bootstrapSession,
  BrandMark,
  logoutSession,
  ShellHeaderActions,
  useNotificationUnreadCount,
  WorkspaceSwitcher
} from "@kloqra/web-shared";
import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  Clock,
  FolderKanban,
  LayoutGrid,
  Timer as TimerIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMySubmissions } from "@/features/approvals/use-my-submissions";
import { OnboardingProvider, useOnboarding } from "@/features/onboarding/onboarding-provider";
import { api } from "@/lib/api";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

const baseNav: readonly SidebarNavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
  { href: "/timer", label: "Timer", Icon: TimerIcon, tourId: "nav-timer" },
  { href: "/time-tracker", label: "Time Tracker", Icon: Clock, tourId: "nav-time-tracker" },
  { href: "/timesheet", label: "Timesheet", Icon: CalendarDays },
  { href: "/approvals", label: "Approvals", Icon: ClipboardCheck, tourId: "nav-approvals" },
  { href: "/notifications", label: "Notifications", Icon: Bell },
  { href: "/projects", label: "My projects", Icon: FolderKanban, tourId: "nav-projects" }
];

function WorkspaceShellInner({ children }: { children: React.ReactNode }) {
  const { openOnboarding, openTour } = useOnboarding();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const [anchorDate] = useState(() => new Date());
  const wsId = session?.workspaceId ?? "";
  const { actionableCount } = useMySubmissions(wsId, anchorDate, "assigned", Boolean(wsId));
  const { count: notificationUnreadCount } = useNotificationUnreadCount(wsId, Boolean(wsId));
  const setWorkspaceNames = useProjectsStore((s) => s.setWorkspaces);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);

  useEffect(() => {
    if (session) return;

    const isImpersonatingRequest =
      typeof window !== "undefined" && window.location.search.includes("impersonate=true");

    if (isImpersonatingRequest) {
      const url = new URL(window.location.href);
      url.searchParams.delete("impersonate");
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }

    void bootstrapSession({ clearBeforeRefresh: isImpersonatingRequest })
      .then((result) => {
        if (!result.ok) {
          router.replace("/login");
          return;
        }
        setWorkspaces(result.workspaces);
        setWorkspaceNames(result.workspaces);
      })
      .catch(() => router.replace("/login"));
  }, [session, setWorkspaces, setWorkspaceNames, router]);

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
    return baseNav.map((item) => {
      if (item.href === "/approvals") return { ...item, badge: actionableCount };
      if (item.href === "/notifications") return { ...item, badge: notificationUnreadCount };
      return item;
    });
  }, [actionableCount, notificationUnreadCount]);

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
      shellToolbar={
        <ShellHeaderActions
          workspaceId={wsId}
          profileHref="/profile"
          settingsHref="/settings"
          notificationsHref="/notifications"
          onShowOnboardingWizard={() => openOnboarding({ replay: true })}
          onShowOnboardingTour={() => openTour({ replay: true })}
        />
      }
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
          firstName={session.user.firstName}
          lastName={session.user.lastName}
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

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <WorkspaceShellInner>{children}</WorkspaceShellInner>
    </OnboardingProvider>
  );
}
