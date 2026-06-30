import { getAccessToken, getWorkspaceId, syncWorkspaceIdToStorage } from "../stores/session.store";
import { readWorkspaceIdFromToken } from "./jwt-payload";

/**
 * Workspace sent as X-Workspace-Id must match the access token (API enforces this).
 * Prefer JWT claim; heal localStorage when it drifted (e.g. switch on another device).
 */
export function getEffectiveWorkspaceId(): string | null {
  const token = getAccessToken();
  const fromToken = readWorkspaceIdFromToken(token);
  const fromStorage = getWorkspaceId();

  if (fromToken && fromStorage && fromToken !== fromStorage) {
    syncWorkspaceIdToStorage(fromToken);
  }

  return fromToken ?? fromStorage;
}

/**
 * Workspace for API headers — JWT claim always wins over stale React state.
 */
export function resolveApiWorkspaceId(explicit?: string | null): string | null {
  const fromToken = readWorkspaceIdFromToken(getAccessToken());
  if (fromToken) {
    if (explicit && explicit !== fromToken) {
      syncWorkspaceIdToStorage(fromToken);
    }
    return fromToken;
  }
  return explicit ?? getWorkspaceId();
}

export function isWorkspaceMismatchError(message: string): boolean {
  return message.toLowerCase().includes("workspace context mismatch");
}
