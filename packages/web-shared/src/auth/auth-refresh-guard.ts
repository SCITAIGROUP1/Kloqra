let authRefreshGeneration = 0;
const invalidationListeners = new Set<() => void>();

const REFRESH_RETRY_MS = 30_000;
const MAX_REFRESH_RETRIES = 3;

let refreshRetryTimer: number | null = null;
let refreshRetryCount = 0;

export function getAuthRefreshGeneration(): number {
  return authRefreshGeneration;
}

/** Drop in-flight refresh work after logout or session replacement (rapid user switch). */
export function invalidateAuthRefresh(): void {
  authRefreshGeneration += 1;
  cancelAuthRefreshRetries();
  for (const listener of invalidationListeners) {
    listener();
  }
}

export function onAuthRefreshInvalidated(listener: () => void): () => void {
  invalidationListeners.add(listener);
  return () => invalidationListeners.delete(listener);
}

export function isAuthRefreshStale(generation: number): boolean {
  return generation !== authRefreshGeneration;
}

export function resetAuthRefreshRetryCount(): void {
  refreshRetryCount = 0;
}

export function cancelAuthRefreshRetries(): void {
  if (refreshRetryTimer !== null) {
    clearTimeout(refreshRetryTimer);
    refreshRetryTimer = null;
  }
  refreshRetryCount = 0;
}

/** Schedule a bounded background refresh retry for transient outages only. */
export function scheduleAuthRefreshRetry(run: () => void, onExhausted: () => void): void {
  if (typeof window === "undefined") return;
  if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
    onExhausted();
    return;
  }
  refreshRetryCount += 1;
  if (refreshRetryTimer !== null) {
    clearTimeout(refreshRetryTimer);
    refreshRetryTimer = null;
  }
  refreshRetryTimer = window.setTimeout(() => {
    refreshRetryTimer = null;
    run();
  }, REFRESH_RETRY_MS);
}

// Platform scope uses separate retry state so tenant/admin refresh is unaffected.
let platformRefreshRetryTimer: number | null = null;
let platformRefreshRetryCount = 0;

export function resetPlatformAuthRefreshRetryCount(): void {
  platformRefreshRetryCount = 0;
}

export function cancelPlatformAuthRefreshRetries(): void {
  if (platformRefreshRetryTimer !== null) {
    clearTimeout(platformRefreshRetryTimer);
    platformRefreshRetryTimer = null;
  }
  platformRefreshRetryCount = 0;
}

export function schedulePlatformAuthRefreshRetry(run: () => void, onExhausted: () => void): void {
  if (typeof window === "undefined") return;
  if (platformRefreshRetryCount >= MAX_REFRESH_RETRIES) {
    onExhausted();
    return;
  }
  platformRefreshRetryCount += 1;
  if (platformRefreshRetryTimer !== null) {
    clearTimeout(platformRefreshRetryTimer);
    platformRefreshRetryTimer = null;
  }
  platformRefreshRetryTimer = window.setTimeout(() => {
    platformRefreshRetryTimer = null;
    run();
  }, REFRESH_RETRY_MS);
}
