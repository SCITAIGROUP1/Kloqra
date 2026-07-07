/** Cache keys scoped by user + workspace so stores never serve another member's data. */
export function memberStoreKey(userId: string, workspaceId: string, suffix?: string): string {
  if (!suffix) return `${userId}:${workspaceId}`;
  return `${userId}:${workspaceId}:${suffix}`;
}

export function workspaceIdFromMemberStoreKey(key: string): string | null {
  const parts = key.split(":");
  if (parts.length < 2) return null;
  return parts[1] ?? null;
}

export function memberStoreKeysForWorkspace(
  keys: Record<string, unknown>,
  workspaceId: string
): string[] {
  return Object.keys(keys).filter((key) => workspaceIdFromMemberStoreKey(key) === workspaceId);
}
