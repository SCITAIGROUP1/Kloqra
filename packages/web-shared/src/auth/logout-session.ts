let logoutEpoch = 0;

/** Mark the start of a logout; used to ignore stale logout navigation after re-login. */
export function beginLogout(): number {
  logoutEpoch += 1;
  return logoutEpoch;
}

/** Cancel pending logout side-effects when a new session is established. */
export function invalidatePendingLogout(): void {
  logoutEpoch += 1;
}

export function isLogoutEpochCurrent(epoch: number): boolean {
  return logoutEpoch === epoch;
}
