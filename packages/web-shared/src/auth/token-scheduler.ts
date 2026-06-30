import { readJwtPayload } from "./jwt-payload";

/** Refresh this many ms before access token expiry. */
const REFRESH_BEFORE_MS = 2 * 60 * 1000;

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;

export function configureProactiveRefresh(handler: () => Promise<string | null>): void {
  refreshHandler = handler;
}

export function scheduleProactiveRefresh(accessToken: string): void {
  if (typeof window === "undefined" || !refreshHandler) return;
  cancelProactiveRefresh();

  const payload = readJwtPayload(accessToken);
  const exp = payload?.exp;
  if (typeof exp !== "number") return;

  const refreshAt = exp * 1000 - REFRESH_BEFORE_MS;
  const delay = Math.max(10_000, refreshAt - Date.now());
  refreshTimer = setTimeout(() => {
    void refreshHandler?.();
  }, delay);
}

export function cancelProactiveRefresh(): void {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}
