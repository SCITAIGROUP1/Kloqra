let logoutEpoch = 0;
let logoutInFlight = false;

/** Mark the start of a logout; used to ignore stale logout navigation after re-login. */
export function beginLogout(): number {
  logoutEpoch += 1;
  logoutInFlight = true;
  return logoutEpoch;
}

/** Cancel pending logout side-effects when a new session is established. */
export function invalidatePendingLogout(): void {
  logoutEpoch += 1;
  logoutInFlight = false;
}

export function isLogoutEpochCurrent(epoch: number): boolean {
  return logoutEpoch === epoch;
}

/** True while logout is clearing cookies / navigating away — skip session restore. */
export function isLogoutInFlight(): boolean {
  return logoutInFlight;
}
