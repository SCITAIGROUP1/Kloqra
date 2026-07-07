/** Redis pub/sub channel for pushing workspace cache invalidation to a user's sockets. */
export function workspaceDataUserChannel(userId: string): string {
  return `workspace-data:user:${userId}`;
}
