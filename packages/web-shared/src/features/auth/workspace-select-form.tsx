"use client";

import { ROUTES } from "@kloqra/contracts";
import type { WorkspaceListItemDto, AuthSessionWithTokenDto } from "@kloqra/contracts";
import { Button, cn } from "@kloqra/ui";
import { Building2, Timer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../api/client";
import {
  formatAdminWorkspaceAccessLabel,
  formatMemberPortalWorkspaceLabel
} from "../../auth/admin-access-label";
import { filterAdminAccessibleWorkspaces } from "../../auth/admin-context";
import { useSessionStore } from "../../stores/session.store";
import { useTenantCurrent } from "../tenant/use-tenant-current";

interface WorkspaceSelectFormProps {
  portalLabel: string;
  defaultRedirect: string;
  roleFilter?: "ADMIN";
  /** Member portal: list all workspaces and show "Member" access labels. */
  memberPortal?: boolean;
}

export function WorkspaceSelectForm({
  portalLabel,
  defaultRedirect,
  roleFilter,
  memberPortal
}: WorkspaceSelectFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const clearSession = useSessionStore((s) => s.clear);
  const { tenant } = useTenantCurrent();
  const isOwner = session?.tenantRole === "OWNER";

  const [workspaces, setWorkspaces] = useState<WorkspaceListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const next = searchParams.get("next");

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(null);
    api<WorkspaceListItemDto[]>(ROUTES.WORKSPACES.LIST, {
      workspaceId: session.workspaceId
    })
      .then((list) => {
        const filtered = roleFilter
          ? list.filter((w) => w.role === roleFilter)
          : memberPortal
            ? list
            : filterAdminAccessibleWorkspaces(list);
        setWorkspaces(filtered);
        if (filtered.length === 0) {
          setError(roleFilter === "ADMIN" ? "No admin workspaces found." : "No workspaces found.");
        }
      })
      .catch(() => {
        setError("Failed to load workspaces. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [session, roleFilter, memberPortal, router]);

  async function handleSelectOrganization() {
    if (!session || switchingId) return;
    setSwitchingId("organization");
    const target = next && next.startsWith("/") ? next : "/account";
    router.push(target);
  }

  async function handleSelectWorkspace(workspaceId: string, workspaceName: string) {
    if (!session) return;
    setSwitchingId(workspaceId);
    try {
      const resolveTarget = (activeSession: typeof session) => {
        if (next && next.startsWith("/")) return next;
        if (activeSession.tenantRole === "OWNER") return "/account";
        return defaultRedirect;
      };

      if (workspaceId === session.workspaceId) {
        router.push(resolveTarget(session));
        return;
      }

      const res = await api<AuthSessionWithTokenDto>(ROUTES.AUTH.SWITCH_WORKSPACE, {
        method: "POST",
        workspaceId: session.workspaceId,
        body: JSON.stringify({ workspaceId })
      });
      setSession(res, res.accessToken, res.refreshToken);
      toast.success(`Switched to ${workspaceName}.`);

      router.push(resolveTarget(res));
    } catch {
      toast.error("Could not switch to selected workspace.");
      setSwitchingId(null);
    }
  }

  async function handleLogout() {
    try {
      await api(ROUTES.AUTH.LOGOUT, { method: "POST" });
    } catch (err) {
      console.error("Logout API call failed:", err);
    }
    clearSession();
    window.location.assign("/login");
  }

  const getInitials = (name: string) => {
    return name
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getAvatarGradient = (name: string) => {
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      "from-pink-500 to-rose-500 text-white",
      "from-indigo-500 to-blue-600 text-white",
      "from-emerald-500 to-teal-600 text-white",
      "from-amber-500 to-orange-600 text-white",
      "from-violet-500 to-purple-600 text-white",
      "from-cyan-500 to-sky-600 text-white"
    ];
    return gradients[hash % gradients.length];
  };

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6 md:p-10 overflow-hidden">
      {/* Ambient radial glow background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,var(--color-primary-glow,rgba(59,130,246,0.06)),transparent_45%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,var(--color-secondary-glow,rgba(236,72,153,0.04)),transparent_50%)]" />

      {/* Grid pattern overlay for tech-y premium texture */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="w-full max-w-2xl bg-card/65 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl shadow-black/15 p-6 sm:p-10 md:p-12 flex flex-col items-center">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8 sm:mb-10 w-full">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 mb-4 hover:scale-105 transition-transform duration-300">
            <Timer className="size-8" strokeWidth={1.5} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
            {portalLabel}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Choose your workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Select a workspace below to continue to your dashboard.
          </p>
        </div>

        {/* Main Content */}
        <div className="w-full flex-1 min-h-[220px]">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[142px] w-full animate-pulse rounded-2xl bg-muted/40 border border-border/30 flex flex-col items-center justify-center p-5"
                >
                  <div className="size-12 rounded-2xl bg-muted/65 mb-3" />
                  <div className="h-4 w-28 bg-muted/65 rounded mb-2" />
                  <div className="h-3 w-14 bg-muted/65 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-destructive/5 border border-destructive/15 rounded-2xl space-y-4">
              <p className="text-sm text-destructive font-semibold">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleLogout()}
                className="w-full max-w-[200px]"
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {isOwner ? (
                <section className="space-y-3">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Organization
                  </p>
                  <button
                    type="button"
                    disabled={switchingId !== null}
                    onClick={() => void handleSelectOrganization()}
                    className="group relative flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-background/30 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/90 hover:shadow-xl hover:shadow-primary/5 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Building2 className="size-6" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                        {tenant?.name ?? "Organization"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">Organization · Owner</p>
                    </div>
                    {switchingId === "organization" ? (
                      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : null}
                  </button>
                </section>
              ) : null}

              <section className="space-y-3">
                {isOwner ? (
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Workspaces
                  </p>
                ) : null}
                <div className="grid max-h-[380px] grid-cols-1 gap-4 overflow-y-auto px-1 py-1 sm:grid-cols-2">
                  {workspaces.map((workspace) => {
                    const isSwitching = switchingId === workspace.id;
                    const isDisabled = switchingId !== null;
                    const gradient = getAvatarGradient(workspace.name);

                    return (
                      <button
                        key={workspace.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => void handleSelectWorkspace(workspace.id, workspace.name)}
                        className="group relative flex flex-col items-center text-center p-5 rounded-2xl border border-border/60 bg-background/30 hover:bg-card/90 hover:border-primary/40 disabled:pointer-events-none disabled:opacity-50 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {/* Initials Avatar with Gradient */}
                        <div
                          className={cn(
                            "flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-base font-bold shadow-sm select-none mb-3 group-hover:scale-110 transition-transform duration-300",
                            gradient
                          )}
                        >
                          {getInitials(workspace.name)}
                        </div>

                        {/* Text Details */}
                        <div className="flex flex-col items-center min-w-0 w-full">
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-full px-1">
                            {workspace.name}
                          </span>
                          <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                            {memberPortal
                              ? formatMemberPortalWorkspaceLabel()
                              : formatAdminWorkspaceAccessLabel(
                                  workspace.role,
                                  workspace.managedProjectIds,
                                  session?.tenantRole
                                )}
                          </span>
                        </div>

                        {/* Loading Overlay */}
                        {isSwitching && (
                          <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-2xl backdrop-blur-[1px] transition-all">
                            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="w-full mt-8 sm:mt-10 pt-6 border-t border-border/40 flex justify-center">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-xs text-muted-foreground hover:text-foreground font-medium underline underline-offset-4 decoration-muted-foreground/30 hover:decoration-foreground transition-all cursor-pointer bg-transparent border-none p-0"
          >
            Sign in with a different account
          </button>
        </div>
      </div>
    </main>
  );
}
