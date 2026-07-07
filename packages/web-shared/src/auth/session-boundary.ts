import type { AuthSessionDto } from "@kloqra/contracts";
import { readUserIdFromToken, readWorkspaceIdFromToken } from "./jwt-payload";
import { applySharedBoundaryReset } from "./session-boundary-reset";
import {
  compareSessionIdentity,
  getSessionIdentity,
  type SessionBoundaryLevel,
  type SessionIdentity
} from "./session-identity";

export const SESSION_BOUNDARY_EVENT = "kloqra:session-boundary";

export type SessionBoundaryReason =
  | "logout"
  | "login"
  | "workspace_switch"
  | "impersonation"
  | "auth_failure"
  | "peer_sync"
  | "session_update";

export type SessionBoundaryContext = {
  prev: AuthSessionDto | null;
  next: AuthSessionDto | null;
  reason: SessionBoundaryReason;
  level?: SessionBoundaryLevel;
};

type SessionBoundaryHandler = (ctx: {
  level: SessionBoundaryLevel;
  reason: SessionBoundaryReason;
  prev: SessionIdentity | null;
  next: SessionIdentity | null;
}) => void;

const handlers: SessionBoundaryHandler[] = [];
let sessionGeneration = 0;
const generationListeners = new Set<() => void>();

export function registerSessionBoundaryHandler(handler: SessionBoundaryHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.indexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}

export function getSessionGeneration(): number {
  return sessionGeneration;
}

export function subscribeSessionGeneration(listener: () => void): () => void {
  generationListeners.add(listener);
  return () => generationListeners.delete(listener);
}

function bumpSessionGeneration(): void {
  sessionGeneration += 1;
  for (const listener of generationListeners) listener();
}

function applySharedBoundary(level: SessionBoundaryLevel, prev: SessionIdentity | null): void {
  applySharedBoundaryReset(level, prev);
}

/**
 * On cold page load the Zustand session is empty while localStorage already holds
 * the active access token. Treat the token as the previous identity so bootstrap
 * does not remount the entire shell when the API returns the same user/workspace.
 */
export function resolveColdHydrationBoundaryLevel(
  next: AuthSessionDto,
  accessToken: string
): SessionBoundaryLevel | undefined {
  const tokenUserId = readUserIdFromToken(accessToken);
  const nextIdentity = getSessionIdentity(next);
  if (!tokenUserId || !nextIdentity || tokenUserId !== nextIdentity.userId) {
    return undefined;
  }

  const virtualPrev: SessionIdentity = {
    userId: tokenUserId,
    tenantId: nextIdentity.tenantId,
    workspaceId: readWorkspaceIdFromToken(accessToken),
    requiresWorkspaceSetup: nextIdentity.requiresWorkspaceSetup,
    impersonatorId: nextIdentity.impersonatorId,
    authScope: nextIdentity.authScope
  };

  return compareSessionIdentity(virtualPrev, nextIdentity);
}

export function applySessionBoundary(ctx: SessionBoundaryContext): SessionBoundaryLevel {
  const prevIdentity = getSessionIdentity(ctx.prev);
  const nextIdentity = getSessionIdentity(ctx.next);
  const level = ctx.level ?? compareSessionIdentity(prevIdentity, nextIdentity);

  if (level === "none") return level;

  applySharedBoundary(level, prevIdentity);

  for (const handler of handlers) {
    handler({ level, reason: ctx.reason, prev: prevIdentity, next: nextIdentity });
  }

  bumpSessionGeneration();

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SESSION_BOUNDARY_EVENT, {
        detail: { level, reason: ctx.reason, prev: prevIdentity, next: nextIdentity }
      })
    );
  }

  return level;
}
