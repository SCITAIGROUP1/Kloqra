export function notificationUnreadKey(userId: string, workspaceId: string): string {
  return `${userId}:${workspaceId}`;
}

export function notificationRecentKey(userId: string, workspaceId: string, limit: number): string {
  return `${userId}:${workspaceId}:${limit}`;
}

export function notificationKeysForWorkspace(
  workspaceId: string,
  keys: Record<string, unknown>
): string[] {
  const suffix = `:${workspaceId}`;
  const recentSuffix = `:${workspaceId}:`;
  return Object.keys(keys).filter((key) => key.endsWith(suffix) || key.includes(recentSuffix));
}
