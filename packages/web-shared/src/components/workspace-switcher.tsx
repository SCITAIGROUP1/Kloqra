"use client";

import { ROUTES } from "@kloqra/contracts";
import type { AuthSessionWithTokenDto, WorkspaceWithRoleDto } from "@kloqra/contracts";
import { cn, Input, Spinner } from "@kloqra/ui";
import { Building2, Check, ChevronDown, ChevronUp, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { api } from "../api/client";
import { getWorkspaceId, useSessionStore } from "../stores/session.store";
import { useWorkspacesStore } from "../stores/workspaces.store";

export type WorkspaceSwitcherProps = {
  /** Only list workspaces where user has this role (e.g. ADMIN for admin app). */
  filterRole?: "ADMIN";
  /** Path after successful switch (e.g. /timer or /dashboard). */
  defaultRedirect: string;
  /** Called after session update, before navigation (e.g. clear project store). */
  onAfterSwitch?: () => void;
  /** Whether the workspace switcher should render in a collapsed state. */
  collapsed?: boolean;
};

export function formatWorkspaceRole(role: WorkspaceWithRoleDto["role"]): string {
  if (role === "ADMIN") return "Admin";
  return "Member";
}

export function filterWorkspacesByQuery(
  workspaces: WorkspaceWithRoleDto[],
  query: string
): WorkspaceWithRoleDto[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return workspaces;
  return workspaces.filter((workspace) => workspace.name.toLowerCase().includes(normalized));
}

function resolveAdminUrl(): string {
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
  return adminUrl;
}

function WorkspaceIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
        className
      )}
    >
      <Building2 className="size-4" strokeWidth={1.5} aria-hidden />
    </span>
  );
}

export function WorkspaceSwitcher({
  filterRole,
  defaultRedirect,
  onAfterSwitch,
  collapsed
}: WorkspaceSwitcherProps) {
  const adminOnly = filterRole === "ADMIN";
  const router = useRouter();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const [switching, setSwitching] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const visible = adminOnly ? workspaces.filter((w) => w.role === "ADMIN") : workspaces;
  const currentId = session?.workspaceId ?? getWorkspaceId() ?? "";
  const currentWorkspace = visible.find((w) => w.id === currentId);
  const isAdmin = session?.workspaceRole === "ADMIN";
  const filtered = useMemo(() => filterWorkspacesByQuery(visible, query), [visible, query]);
  const canOpen = !switching && visible.length > 0;

  useEffect(() => {
    if (!session || workspaces.length > 0) return;
    api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, { workspaceId: currentId })
      .then(setWorkspaces)
      .catch(() => {});
  }, [session, workspaces.length, currentId, setWorkspaces]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !containerRef.current) {
      setMenuStyle(null);
      return;
    }

    function updatePosition() {
      const node = containerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (collapsed) {
        setMenuStyle({
          position: "fixed",
          top: rect.top,
          left: rect.right + 8,
          width: "17rem"
        });
      } else {
        setMenuStyle({
          position: "fixed",
          top: rect.bottom + 6,
          left: rect.left,
          width: rect.width
        });
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, collapsed]);

  async function switchWorkspace(nextId: string) {
    if (!session || nextId === currentId || switching) return;
    if (adminOnly && !visible.find((w) => w.id === nextId)) return;

    setSwitching(true);
    try {
      const res = await api<AuthSessionWithTokenDto>(ROUTES.AUTH.SWITCH_WORKSPACE, {
        method: "POST",
        workspaceId: currentId,
        body: JSON.stringify({ workspaceId: nextId })
      });
      if (adminOnly && res.workspaceRole !== "ADMIN") {
        toast.error("Admin access required for this app.");
        return;
      }
      setSession(res, res.accessToken, res.refreshToken);
      onAfterSwitch?.();
      const list = await api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, {
        workspaceId: nextId
      });
      setWorkspaces(list);
      setOpen(false);
      setQuery("");
      const switched = list.find((w) => w.id === nextId);
      toast.success(switched ? `Switched to ${switched.name}` : "Workspace switched.");
      router.push(defaultRedirect);
      router.refresh();
    } catch {
      toast.error("Could not switch workspace.");
    } finally {
      setSwitching(false);
    }
  }

  function onCreateWorkspace() {
    if (typeof window !== "undefined") {
      window.location.href = `${resolveAdminUrl()}/workspace?create=true`;
    }
  }

  if (visible.length === 0) return null;

  const dropdown =
    open && menuStyle && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            id={listboxId}
            style={menuStyle}
            className="z-[80] overflow-hidden rounded-xl border border-border/80 bg-card shadow-lg"
          >
            <div className="border-b border-border/60 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search workspaces..."
                  className="h-8 border-border/70 bg-muted/20 pl-8 text-xs shadow-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No workspaces found.
                </p>
              ) : (
                filtered.map((workspace) => {
                  const selected = workspace.id === currentId;
                  return (
                    <button
                      key={workspace.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={switching}
                      onClick={() => void switchWorkspace(workspace.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                        selected ? "bg-muted/40" : "hover:bg-muted/30"
                      )}
                    >
                      <WorkspaceIcon className="h-7 w-7 rounded-md bg-muted/50 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium leading-tight">
                          {workspace.name}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {formatWorkspaceRole(workspace.role)}
                        </span>
                      </span>
                      {selected ? (
                        <Check className="size-4 shrink-0 text-primary" aria-hidden />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>

            {isAdmin ? (
              <div className="border-t border-border/60 p-1.5">
                <button
                  type="button"
                  onClick={onCreateWorkspace}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <Plus className="size-4" aria-hidden />
                  Create Workspace
                </button>
              </div>
            ) : null}
          </div>,
          document.body
        )
      : null;

  if (collapsed) {
    const initials = (currentWorkspace?.name ?? "Workspace")
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <div ref={containerRef} className="relative flex justify-center w-full">
        <button
          type="button"
          disabled={!canOpen}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          onClick={() => canOpen && setOpen((value) => !value)}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-muted/20 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-sm transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
          title={currentWorkspace?.name ?? "Workspace"}
        >
          {switching ? <Spinner size="sm" className="absolute inset-0 m-auto" /> : null}
          {initials}
        </button>
        {dropdown}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full space-y-2">
      <p className="px-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Workspace
      </p>

      <button
        type="button"
        disabled={!canOpen}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => canOpen && setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left transition-colors",
          canOpen ? "hover:bg-muted/30" : "cursor-default opacity-80"
        )}
      >
        <WorkspaceIcon />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium leading-tight">
            {currentWorkspace?.name ?? "Select workspace"}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {currentWorkspace ? formatWorkspaceRole(currentWorkspace.role) : "—"}
          </span>
        </span>
        {canOpen ? (
          open ? (
            <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          )
        ) : null}
      </button>

      {dropdown}
    </div>
  );
}
