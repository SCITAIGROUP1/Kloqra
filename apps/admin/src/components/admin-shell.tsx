"use client";

import { BRAND_NAME } from "@kloqra/contracts";
import { ResponsiveLayoutShell, SidebarUserFooter, type SidebarNavItem } from "@kloqra/ui";
import {
  bootstrapSession,
  BrandMark,
  logoutSession,
  ShellHeaderActions,
  useNotificationSocket,
  useNotificationUnreadCount,
  WorkspaceSwitcher
} from "@kloqra/web-shared";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ADMIN_NAV_ITEMS } from "@/config/admin-nav";
import { usePendingTimesheetsBadgeCount } from "@/features/approvals/use-pending-timesheets";
import { GlobalSearchShell } from "@/features/global-search/global-search-shell";
import { useAdminWorkspaceDataSync } from "@/lib/workspace-data-sync";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const wsId = session?.workspaceId ?? "";
  useNotificationSocket(wsId, Boolean(wsId && session?.workspaceRole === "ADMIN"));
  useAdminWorkspaceDataSync(wsId);
  const { count: notificationUnreadCount } = useNotificationUnreadCount(
    wsId,
    Boolean(wsId && session?.workspaceRole === "ADMIN")
  );
  const pendingCount = usePendingTimesheetsBadgeCount(
    wsId,
    Boolean(wsId && session?.workspaceRole === "ADMIN")
  );

  useEffect(() => {
    if (session) {
      if (session.workspaceRole !== "ADMIN") router.replace("/login?error=admin");
      return;
    }

    void bootstrapSession({ requiredRole: "ADMIN" })
      .then((result) => {
        if (!result.ok) {
          router.replace("/login?error=admin");
          return;
        }
        setWorkspaces(result.workspaces);
      })
      .catch(() => router.replace("/login?error=admin"));
  }, [session, setWorkspaces, router]);

  const nav = useMemo((): readonly SidebarNavItem[] => {
    return ADMIN_NAV_ITEMS.map((item) => {
      if (item.href === "/approvals") return { ...item, badge: pendingCount };
      if (item.href === "/notifications") return { ...item, badge: notificationUnreadCount };
      return item;
    });
  }, [pendingCount, notificationUnreadCount]);

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
    <>
      <GlobalSearchShell workspaceId={wsId} />
      <ResponsiveLayoutShell
        navItems={nav}
        logoIcon={<BrandMark size="lg" iconOnly />}
        logoTitle={BRAND_NAME}
        logoSubtitle="Admin Portal"
        logoLinkHref="/dashboard"
        shellToolbar={
          <ShellHeaderActions
            workspaceId={wsId}
            profileHref="/profile"
            settingsHref="/settings"
            notificationsHref="/notifications"
          />
        }
        workspaceSwitcher={(collapsed) => (
          <WorkspaceSwitcher
            filterRole="ADMIN"
            defaultRedirect="/dashboard"
            collapsed={collapsed}
          />
        )}
        footerContent={(collapsed) => (
          <SidebarUserFooter
            collapsed={collapsed}
            userName={session.user.name ?? "Admin"}
            profileHref="/profile"
            onLogout={() => {
              void logoutSession(session.workspaceId).then(() => router.push("/login"));
            }}
          />
        )}
      >
        {children}
      </ResponsiveLayoutShell>
    </>
  );
}
