"use client";

import { BRAND_NAME, ROUTES } from "@kloqra/contracts";
import type { AuthSessionDto, PendingTimesheetDto, WorkspaceWithRoleDto } from "@kloqra/contracts";
import { ResponsiveLayoutShell, SidebarUserFooter, type SidebarNavItem } from "@kloqra/ui";
import {
  applyDefaultWorkspaceIfNeeded,
  BrandMark,
  getAccessToken,
  logoutSession,
  ShellHeaderActions,
  WorkspaceSwitcher
} from "@kloqra/web-shared";
import {
  Activity,
  Building2,
  ClipboardCheck,
  CreditCard,
  Download,
  FolderKanban,
  LayoutDashboard,
  Tags,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

const baseNav = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/team-management", label: "Team Management", Icon: Users },
  { href: "/projects", label: "Projects", Icon: FolderKanban },
  { href: "/categories", label: "Categories", Icon: Tags },
  { href: "/team", label: "Team Live", Icon: Activity },
  { href: "/approvals", label: "Approvals", Icon: ClipboardCheck },
  { href: "/billing", label: "Billing", Icon: CreditCard },
  { href: "/exports", label: "Exports", Icon: Download },
  { href: "/workspace", label: "Workspace", Icon: Building2 }
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, setSession } = useSessionStore();
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const [pendingCount, setPendingCount] = useState(0);

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
      .then(async (s) => {
        if (s.workspaceRole !== "ADMIN") {
          router.replace("/login?error=admin");
          return;
        }
        const switched = await applyDefaultWorkspaceIfNeeded(s, token);
        if (switched.session.workspaceRole !== "ADMIN") {
          router.replace("/login?error=admin");
          return;
        }
        setSession(switched.session, switched.accessToken);
        return api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, {
          workspaceId: switched.session.workspaceId
        });
      })
      .then((list) => {
        if (list) setWorkspaces(list);
      })
      .catch(() => router.replace("/login"));
  }, [session, setSession, setWorkspaces, router]);

  useEffect(() => {
    if (!session?.workspaceId || session.workspaceRole !== "ADMIN") return;

    const loadPendingCount = () => {
      void api<PendingTimesheetDto[]>(ROUTES.TIMESHEETS.LIST_PENDING, {
        workspaceId: session.workspaceId
      })
        .then((items) => setPendingCount(items.length))
        .catch(() => setPendingCount(0));
    };

    loadPendingCount();
    const interval = setInterval(loadPendingCount, 60_000);
    return () => clearInterval(interval);
  }, [session?.workspaceId, session?.workspaceRole]);

  const nav = useMemo((): readonly SidebarNavItem[] => {
    return baseNav.map((item) =>
      item.href === "/approvals" ? { ...item, badge: pendingCount } : item
    );
  }, [pendingCount]);

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
      logoIcon={<BrandMark size="lg" iconOnly />}
      logoTitle={BRAND_NAME}
      logoSubtitle="Admin Portal"
      logoLinkHref="/dashboard"
      shellToolbar={<ShellHeaderActions profileHref="/profile" settingsHref="/settings" />}
      workspaceSwitcher={(collapsed) => (
        <WorkspaceSwitcher filterRole="ADMIN" defaultRedirect="/dashboard" collapsed={collapsed} />
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
  );
}
