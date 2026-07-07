import { resolveApiWorkspaceId } from "../../auth/workspace-context";
import { useSessionStore } from "../../stores/session.store";

/** Workspace id for tenant-scoped API calls (optional — tenant routes work without one). */
export function useTenantApiWorkspaceId(): string | null {
  const sessionWs = useSessionStore((s) => s.session?.workspaceId);
  return resolveApiWorkspaceId(sessionWs ?? null);
}

export function tenantApiOptions(workspaceId: string | null): { workspaceId?: string } {
  return workspaceId ? { workspaceId } : {};
}
