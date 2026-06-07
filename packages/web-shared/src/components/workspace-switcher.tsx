"use client";

import { ROUTES } from "@chronomint/contracts";
import type { AuthSessionWithTokenDto, WorkspaceWithRoleDto } from "@chronomint/contracts";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@chronomint/ui";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

export function WorkspaceSwitcher({
  filterRole,
  defaultRedirect,
  onAfterSwitch,
  collapsed
}: WorkspaceSwitcherProps) {
  const adminOnly = filterRole === "ADMIN";
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const [switching, setSwitching] = useState(false);

  const visible = adminOnly ? workspaces.filter((w) => w.role === "ADMIN") : workspaces;
  const currentId = session?.workspaceId ?? getWorkspaceId() ?? "";
  const isAdmin = session?.workspaceRole === "ADMIN";
  const disableSwitcher = switching || (isAdmin ? visible.length === 0 : visible.length < 2);

  useEffect(() => {
    if (!session || workspaces.length > 0) return;
    api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, { workspaceId: currentId })
      .then(setWorkspaces)
      .catch(() => {});
  }, [session, workspaces.length, currentId, setWorkspaces]);

  async function onChange(nextId: string) {
    if (nextId === "create_new_workspace") {
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3002";
      if (typeof window !== "undefined") {
        window.location.href = `${adminUrl}/workspace?create=true`;
      }
      return;
    }
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
        alert("Admin access required for this app.");
        return;
      }
      setSession(res, res.accessToken);
      onAfterSwitch?.();
      const list = await api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, {
        workspaceId: nextId
      });
      setWorkspaces(list);
      router.push(defaultRedirect);
      router.refresh();
    } catch {
      alert("Could not switch workspace.");
    } finally {
      setSwitching(false);
    }
  }

  if (visible.length === 0) return null;

  if (collapsed) {
    const currentWorkspaceName = visible.find((w) => w.id === currentId)?.name ?? "Workspace";
    const initials = currentWorkspaceName
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return (
      <div className="flex justify-center w-full">
        <Select value={currentId} onValueChange={onChange} disabled={disableSwitcher}>
          <SelectTrigger className="h-9 w-9 p-0 flex items-center justify-center rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors shadow-sm focus:ring-1 focus:ring-ring">
            <span className="text-xs font-semibold uppercase tracking-wide">{initials}</span>
          </SelectTrigger>
          <SelectContent>
            {visible.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
                {!adminOnly && w.role === "ADMIN" ? " (admin)" : ""}
              </SelectItem>
            ))}
            {isAdmin && (
              <>
                <div className="h-px bg-border/60 my-1" />
                <SelectItem
                  value="create_new_workspace"
                  className="text-primary focus:bg-primary focus:text-primary-foreground font-medium cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="h-3 w-3" />
                    Create Workspace
                  </span>
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-1.5">
      <Label className="text-xs text-muted-foreground">Workspace</Label>
      <Select value={currentId} onValueChange={onChange} disabled={disableSwitcher}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select workspace" />
        </SelectTrigger>
        <SelectContent>
          {visible.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {w.name}
              {!adminOnly && w.role === "ADMIN" ? " (admin)" : ""}
            </SelectItem>
          ))}
          {isAdmin && (
            <>
              <div className="h-px bg-border/60 my-1" />
              <SelectItem
                value="create_new_workspace"
                className="text-primary focus:bg-primary focus:text-primary-foreground font-medium cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Plus className="h-3 w-3" />
                  Create Workspace
                </span>
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
