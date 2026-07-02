"use client";

import { ROUTES } from "@kloqra/contracts";
import type { AuthSessionWithTokenDto, WorkspaceListItemDto } from "@kloqra/contracts";
import { Button, cn } from "@kloqra/ui";
import { Building2, Timer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "../../api/client";
import { formatAdminWorkspaceAccessLabel } from "../../auth/admin-access-label";
import { filterAdminAccessibleWorkspaces } from "../../auth/admin-context";
import { useSessionStore } from "../../stores/session.store";
import { useTenantCurrent } from "../tenant/use-tenant-current";

export type AdminContextSelectFormProps = {
  portalLabel: string;
  defaultRedirect?: string;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarGradient(name: string) {
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
}

export function AdminContextSelectForm({
  portalLabel,
  defaultRedirect = "/dashboard"
}: AdminContextSelectFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const clearSession = useSessionStore((s) => s.clear);
  const { tenant, loading: tenantLoading } = useTenantCurrent();

  const [workspaces, setWorkspaces] = useState<WorkspaceListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const next = searchParams.get("next");
  const isOwner = session?.tenantRole === "OWNER";
  const orgName = tenant?.name ?? "Organization";

  const accessibleWorkspaces = useMemo(
    () => filterAdminAccessibleWorkspaces(workspaces),
    [workspaces]
  );

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
        const filtered = filterAdminAccessibleWorkspaces(list);
        setWorkspaces(list);
        if (filtered.length === 0 && !isOwner) {
          setError("No admin workspaces found.");
        }
      })
      .catch(() => {
        setError("Failed to load workspaces. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [session, isOwner, router]);

  async function handleSelectOrganization() {
    if (switchingId) return;
    setSwitchingId("organization");
    const target = next && next.startsWith("/") ? next : "/account";
    router.push(target);
  }

  async function handleSelectWorkspace(workspaceId: string, workspaceName: string) {
    if (!session) return;
    setSwitchingId(workspaceId);
    try {
      const target = next && next.startsWith("/") ? next : defaultRedirect;

      if (workspaceId === session.workspaceId) {
        router.push(target);
        return;
      }

      const res = await api<AuthSessionWithTokenDto>(ROUTES.AUTH.SWITCH_WORKSPACE, {
        method: "POST",
        workspaceId: session.workspaceId,
        body: JSON.stringify({ workspaceId })
      });
      setSession(res, res.accessToken, res.refreshToken);
      toast.success(`Switched to ${workspaceName}.`);
      router.push(target);
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

  const isBusy = switchingId !== null;
  const showLoading = loading || (isOwner && tenantLoading);

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background p-4 sm:p-6 md:p-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,var(--color-primary-glow,rgba(59,130,246,0.06)),transparent_45%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,var(--color-secondary-glow,rgba(236,72,153,0.04)),transparent_50%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="flex w-full max-w-2xl flex-col items-center rounded-3xl border border-border/50 bg-card/65 p-6 shadow-2xl shadow-black/15 backdrop-blur-xl sm:p-10 md:p-12">
        <div className="mb-8 flex w-full flex-col items-center text-center sm:mb-10">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform duration-300 hover:scale-105">
            <Timer className="size-8" strokeWidth={1.5} />
          </div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            {portalLabel}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Choose how you want to work
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Pick your organization for billing and settings, or a workspace for day-to-day
            operations.
          </p>
        </div>

        <div className="min-h-[220px] w-full flex-1">
          {showLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex h-[142px] w-full animate-pulse flex-col items-center justify-center rounded-2xl border border-border/30 bg-muted/40 p-5"
                >
                  <div className="mb-3 size-12 rounded-2xl bg-muted/65" />
                  <div className="mb-2 h-4 w-28 rounded bg-muted/65" />
                  <div className="h-3 w-14 rounded-full bg-muted/65" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-destructive/15 bg-destructive/5 p-8 text-center">
              <p className="text-sm font-semibold text-destructive">{error}</p>
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
                    disabled={isBusy}
                    onClick={() => void handleSelectOrganization()}
                    className="group relative flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-background/30 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/90 hover:shadow-xl hover:shadow-primary/5 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Building2 className="size-6" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                        {orgName}
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
                <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Workspaces
                </p>
                <div className="grid max-h-[380px] grid-cols-1 gap-4 overflow-y-auto px-1 py-1 sm:grid-cols-2">
                  {accessibleWorkspaces.map((workspace) => {
                    const isSwitching = switchingId === workspace.id;
                    const gradient = getAvatarGradient(workspace.name);
                    const accessLabel = formatAdminWorkspaceAccessLabel(
                      workspace.role,
                      workspace.managedProjectIds,
                      session?.tenantRole
                    );

                    return (
                      <button
                        key={workspace.id}
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleSelectWorkspace(workspace.id, workspace.name)}
                        className="group relative flex cursor-pointer flex-col items-center rounded-2xl border border-border/60 bg-background/30 p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-primary/40 hover:bg-card/90 hover:shadow-xl hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
                      >
                        <div
                          className={cn(
                            "mb-3 flex size-12 select-none items-center justify-center rounded-2xl bg-gradient-to-br text-base font-bold shadow-sm transition-transform duration-300 group-hover:scale-110",
                            gradient
                          )}
                        >
                          {getInitials(workspace.name)}
                        </div>
                        <div className="flex w-full min-w-0 flex-col items-center">
                          <span className="max-w-full truncate px-1 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                            {workspace.name}
                          </span>
                          <span className="mt-1.5 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary transition-colors group-hover:bg-primary/20">
                            {accessLabel}
                          </span>
                        </div>
                        {isSwitching ? (
                          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-card/80 backdrop-blur-[1px]">
                            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="mt-8 flex w-full justify-center border-t border-border/40 pt-6 sm:mt-10">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="cursor-pointer border-none bg-transparent p-0 text-xs font-medium text-muted-foreground underline decoration-muted-foreground/30 underline-offset-4 transition-all hover:text-foreground hover:decoration-foreground"
          >
            Sign in with a different account
          </button>
        </div>
      </div>
    </main>
  );
}
