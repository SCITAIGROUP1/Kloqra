import type { AuthSessionDto } from "@kloqra/contracts";
import { useSessionStore } from "../../stores/session.store";
import { tenantApiOptions, useTenantApiWorkspaceId } from "../tenant/tenant-api-workspace";

/** Profile store key — workspace id or tenant-scoped fallback during onboarding. */
export function resolveProfileCacheKey(
  session: Partial<Pick<AuthSessionDto, "workspaceId" | "tenantId">> | null | undefined
): string | null {
  if (session?.workspaceId) return session.workspaceId;
  if (session?.tenantId) return `tenant:${session.tenantId}`;
  return null;
}

export function profileApiOptions(cacheKey: string | null): { workspaceId?: string } {
  if (!cacheKey || cacheKey.startsWith("tenant:")) {
    return {};
  }
  return tenantApiOptions(cacheKey);
}

export function useProfileCacheKey(): string | null {
  const session = useSessionStore((s) => s.session);
  const workspaceId = useTenantApiWorkspaceId();
  if (workspaceId) return workspaceId;
  return resolveProfileCacheKey(session);
}
