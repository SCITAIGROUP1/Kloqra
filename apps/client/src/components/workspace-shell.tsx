"use client";

import { ROUTES } from "@chronomint/contracts";
import type { AuthSessionDto, WorkspaceWithRoleDto } from "@chronomint/contracts";
import { Button, cn } from "@chronomint/ui";
import { ThemeToggle, WorkspaceSwitcher } from "@chronomint/web-shared";
import { CalendarDays, FolderKanban, ListTodo, LogOut, Timer as TimerIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

const nav = [
  { href: "/timer", label: "Timer", Icon: TimerIcon },
  { href: "/timesheet", label: "Timesheet", Icon: CalendarDays },
  { href: "/projects", label: "My projects", Icon: FolderKanban },
  { href: "/tasks", label: "Tasks", Icon: ListTodo }
] as const;

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, setSession, clear } = useSessionStore();
  const setWorkspaceNames = useProjectsStore((s) => s.setWorkspaces);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);

  useEffect(() => {
    if (session) return;
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
        setSession(s, token);
        return api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, { workspaceId: ws });
      })
      .then((list) => {
        setWorkspaces(list);
        setWorkspaceNames(list);
      })
      .catch(() => router.replace("/login"));
  }, [session, setSession, setWorkspaces, setWorkspaceNames, router]);

  async function logout() {
    await api(ROUTES.AUTH.LOGOUT, { method: "DELETE", workspaceId: session?.workspaceId });
    clear();
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
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-[17rem] shrink-0 flex-col border-r border-border/80 bg-card/90 shadow-sm backdrop-blur-md">
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
          <Link href="/timer" className="flex items-center gap-3 rounded-xl px-1 py-0.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
              <TimerIcon className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">ChronoMint</p>
              <p className="truncate text-xs text-muted-foreground">{session.user.name}</p>
            </div>
          </Link>

          <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
            <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Workspace
            </p>
            <WorkspaceSwitcher
              defaultRedirect="/timer"
              onAfterSwitch={() => {
                useProjectsStore.getState().setProjects([]);
                useProjectsStore.getState().setTasks([]);
              }}
            />
          </div>

          <nav className="flex flex-col gap-0.5" aria-label="Main">
            {nav.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                  )}
                >
                  {active ? (
                    <span
                      className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                      aria-hidden
                    />
                  ) : null}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                    strokeWidth={active ? 2.25 : 2}
                    aria-hidden
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 space-y-3 border-t border-border/70 p-4">
          <div>
            <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Appearance
            </p>
            <ThemeToggle />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Log out
          </Button>
        </div>
      </aside>

      <main className="min-h-screen min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
