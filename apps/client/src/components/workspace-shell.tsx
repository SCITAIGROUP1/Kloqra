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
import { AssistantProvider, useAssistant } from "@/features/assistant/assistant-provider";
import { AssistantWidget } from "@/features/assistant/assistant-widget";
import { OnboardingProvider, useOnboarding } from "@/features/onboarding/onboarding-provider";
import { useMySubmissionsBadgeCount } from "@/features/submissions/use-my-submissions";
import { api } from "@/lib/api";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

const baseNav: readonly SidebarNavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
  { href: "/timer", label: "Timer", Icon: TimerIcon, tourId: "nav-timer" },
  { href: "/time-tracker", label: "Time Tracker", Icon: Clock, tourId: "nav-time-tracker" },
  { href: "/timesheet", label: "Timesheet", Icon: CalendarDays },
  { href: "/submissions", label: "Submissions", Icon: ClipboardCheck, tourId: "nav-submissions" },
  { href: "/notifications", label: "Notifications", Icon: Bell },
  { href: "/projects", label: "My projects", Icon: FolderKanban, tourId: "nav-projects" }
];

const IMPERSONATION_HANDOFF_KEY = "kloqra:impersonation-handoff";

function WorkspaceShellInner({ children }: { children: React.ReactNode }) {
  const { openOnboarding, openTour } = useOnboarding();
  const { openAssistant } = useAssistant();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const [anchorDate] = useState(() => new Date());
  const wsId = session?.workspaceId ?? "";
  const actionableCount = useMySubmissionsBadgeCount(wsId, anchorDate, "assigned", Boolean(wsId));
  const { count: notificationUnreadCount } = useNotificationUnreadCount(wsId, Boolean(wsId));
  const setWorkspaceNames = useProjectsStore((s) => s.setWorkspaces);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);

  useEffect(() => {
    if (session) return;

    const params = new URLSearchParams(window.location.search);
    const handoffFromUrl = params.get("handoff");
    const legacyImpersonate = params.get("impersonate") === "true";

    if (handoffFromUrl) {
      sessionStorage.setItem(IMPERSONATION_HANDOFF_KEY, handoffFromUrl);
    }

    if (handoffFromUrl || legacyImpersonate) {
      params.delete("handoff");
      params.delete("impersonate");
      const query = params.toString();
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + (query ? `?${query}` : "")
      );
    }

    const handoffToken =
      handoffFromUrl ?? sessionStorage.getItem(IMPERSONATION_HANDOFF_KEY) ?? undefined;

    void bootstrapSession({
      handoffToken,
      clearBeforeRefresh: legacyImpersonate && !handoffToken
    })
      .then((result) => {
        sessionStorage.removeItem(IMPERSONATION_HANDOFF_KEY);
        if (!result.ok) {
          router.replace("/login");
          return;
        }
        setWorkspaces(result.workspaces);
        setWorkspaceNames(result.workspaces);
      })
      .catch(() => {
        sessionStorage.removeItem(IMPERSONATION_HANDOFF_KEY);
        router.replace("/login");
      });
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
      if (item.href === "/submissions") return { ...item, badge: actionableCount };
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
          onOpenAssistant={openAssistant}
        />
      }
      impersonationBanner={
        session.impersonatorId ? (
          <div className="sticky top-0 z-50 flex items-center justify-between border-b border-status-warning-border bg-status-warning-bg px-6 py-3 text-xs text-status-warning-fg backdrop-blur-md lg:px-8">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warning" />
              </span>
              <span>
                👁 Viewing as <strong className="font-semibold">{session.user.name}</strong> —
                read-only mode{" "}
                <span className="opacity-70">
                  (impersonated by Admin{" "}
                  <strong className="font-semibold">{session.impersonatorName}</strong>)
                </span>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-status-warning-border px-3 text-xs text-status-warning-fg transition-colors hover:bg-status-warning-bg/80"
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
      <AssistantWidget />
    </ResponsiveLayoutShell>
  );
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <AssistantProvider>
        <WorkspaceShellInner>{children}</WorkspaceShellInner>
      </AssistantProvider>
    </OnboardingProvider>
  );
}
