/** Read unverified JWT payload (client-side hint only — API always verifies). */
export function readJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function readWorkspaceIdFromToken(token: string | null): string | null {
  if (!token) return null;
  const payload = readJwtPayload(token);
  const ws = payload?.workspaceId;
  return typeof ws === "string" && ws.length > 0 ? ws : null;
}
