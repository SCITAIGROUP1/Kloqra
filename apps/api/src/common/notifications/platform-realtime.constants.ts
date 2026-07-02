export function platformNotificationUserChannel(platformUserId: string): string {
  return `platform-notifications:${platformUserId}`;
}
