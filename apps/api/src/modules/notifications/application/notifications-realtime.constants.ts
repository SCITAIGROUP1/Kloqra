/** Redis pub/sub channel for pushing in-app notifications to a user's open sockets. */
export function notificationUserChannel(userId: string): string {
  return `notifications:user:${userId}`;
}
