export const timerKey = (workspaceId: string, userId: string) => `timer:${workspaceId}:${userId}`;
export const timerAutoStoppedKey = (workspaceId: string, userId: string) =>
  `timer_autostopped:${workspaceId}:${userId}`;
