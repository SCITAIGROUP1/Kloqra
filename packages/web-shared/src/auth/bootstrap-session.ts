import { ROUTES } from "@kloqra/contracts";
import type { AuthSessionDto, WorkspaceListItemDto } from "@kloqra/contracts";
import { getApiBase } from "../api/base";
import { api } from "../api/client";
import { getAccessToken, useSessionStore } from "../stores/session.store";
import { useWorkspacesStore } from "../stores/workspaces.store";
import { canLoginToAdminApp } from "./admin-app-access";
import { applyDefaultWorkspaceIfNeeded } from "./apply-default-workspace";
import { classifyBootstrapError, type BootstrapFailureReason } from "./bootstrap-failure";
import { isAccessTokenExpired, readUserIdFromToken } from "./jwt-payload";
import { isLogoutInFlight } from "./logout-session";
import { tryRefreshSession } from "./refresh-session";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

let handoffCompletePromise: Promise<string | null> | null = null;
let handoffCompleteToken: string | null = null;

async function performHandoffComplete(handoffToken: string): Promise<string | null> {
  const res = await fetch(`${getApiBase()}${ROUTES.AUTH.IMPERSONATE_COMPLETE}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Scope": AUTH_SCOPE
    },
    body: JSON.stringify({ handoffToken })
  });
  if (!res.ok) return null;
  const body = (await res.json()) as AuthSessionDto & {
    accessToken?: string;
    refreshToken?: string;
  };
  if (!body.accessToken) return null;
  useSessionStore.getState().setSession(body, body.accessToken, body.refreshToken, {
    boundaryReason: "impersonation"
  });
  return body.accessToken;
}

async function completeImpersonationHandoff(handoffToken: string): Promise<string | null> {
  if (handoffCompletePromise && handoffCompleteToken === handoffToken) {
    return handoffCompletePromise;
  }
  handoffCompleteToken = handoffToken;
  handoffCompletePromise = performHandoffComplete(handoffToken).finally(() => {
    handoffCompletePromise = null;
    handoffCompleteToken = null;
  });
  return handoffCompletePromise;
}

export type BootstrapResult =
  | { ok: true; session: AuthSessionDto; workspaces: WorkspaceListItemDto[] }
  | { ok: false; reason: BootstrapFailureReason };

export type { BootstrapFailureReason };

export type BootstrapOptions = {
  /** Clear local session before refresh (legacy impersonation handoff). */
  clearBeforeRefresh?: boolean;
  /** One-time impersonation token from admin redirect (production cross-site handoff). */
  handoffToken?: string;
  /** Require workspace role after bootstrap. */
  requiredRole?: "ADMIN" | "MEMBER";
  /** Allow workspace MEMBER with led projects (admin app project-lead access). */
  allowProjectLead?: boolean;
  /** Allow tenant OWNER/ADMIN without workspace ADMIN (organization account mode). */
  allowTenantOperator?: boolean;
};

/** Skip stale bootstrap results when another login replaced tokens mid-flight. */
export function shouldApplyBootstrapSession(
  bootstrapToken: string,
  nextSession: AuthSessionDto
): boolean {
  const storedToken = getAccessToken();
  const currentSession = useSessionStore.getState().session;
  const nextUserId = nextSession.user?.id;
  if (!nextUserId) return false;

  if (storedToken && storedToken !== bootstrapToken) {
    return false;
  }

  if (currentSession && currentSession.user.id !== nextUserId) {
    const storedUserId = readUserIdFromToken(storedToken);
    if (storedUserId === currentSession.user.id) {
      return false;
    }
  }

  const bootstrapUserId = readUserIdFromToken(bootstrapToken);
  if (bootstrapUserId && bootstrapUserId !== nextUserId) {
    return false;
  }

  return true;
}

/**
 * Restore session from refresh cookie and/or access token, then load workspaces.
 */
export async function bootstrapSession(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  if (isLogoutInFlight() && !options.handoffToken) {
    return { ok: false, reason: "unauthenticated" };
  }

  if (options.clearBeforeRefresh || options.handoffToken) {
    useSessionStore.getState().clear({
      boundaryReason: options.handoffToken ? "impersonation" : "login"
    });
  }

  let token: string | null = null;
  if (options.handoffToken) {
    token = await completeImpersonationHandoff(options.handoffToken);
    if (!token) return { ok: false, reason: "unauthenticated" };
  } else {
    token = getAccessToken();
    if (!token || isAccessTokenExpired(token) || options.clearBeforeRefresh) {
      token = await tryRefreshSession();
      if (!token) return { ok: false, reason: "unauthenticated" };
    }
  }

  try {
    let session = await api<AuthSessionDto>(ROUTES.AUTH.ME);

    if (options.requiredRole === "ADMIN") {
      if (!canLoginToAdminApp(session)) {
        return { ok: false, reason: "forbidden" };
      }
    } else if (options.requiredRole && session.workspaceRole !== options.requiredRole) {
      return { ok: false, reason: "forbidden" };
    }

    const switched = await applyDefaultWorkspaceIfNeeded(session, token);
    session = switched.session;
    token = switched.accessToken;

    if (options.requiredRole === "ADMIN") {
      if (!canLoginToAdminApp(session)) {
        return { ok: false, reason: "forbidden" };
      }
    } else if (options.requiredRole && session.workspaceRole !== options.requiredRole) {
      return { ok: false, reason: "forbidden" };
    }

    if (!shouldApplyBootstrapSession(token, session)) {
      const currentSession = useSessionStore.getState().session;
      if (currentSession) {
        return { ok: true, session: currentSession, workspaces: [] };
      }
      return { ok: false, reason: "unauthenticated" };
    }

    useSessionStore.getState().setSession(session, token, undefined, {
      boundaryReason: "session_update"
    });

    const seeded = useWorkspacesStore.getState().workspaces;
    if (seeded.length > 0) {
      return { ok: true, session, workspaces: seeded };
    }

    const workspaces = session.workspaceId
      ? await api<WorkspaceListItemDto[]>(ROUTES.WORKSPACES.LIST, {
          workspaceId: session.workspaceId
        })
      : [];
    if (workspaces.length > 0) {
      useWorkspacesStore.getState().setWorkspaces(workspaces);
    }

    return { ok: true, session, workspaces };
  } catch (err) {
    return { ok: false, reason: classifyBootstrapError(err) };
  }
}
