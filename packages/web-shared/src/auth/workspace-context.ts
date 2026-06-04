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

export function isWorkspaceMismatchError(message: string): boolean {
  return message.toLowerCase().includes("workspace context mismatch");
}
