let authRefreshGeneration = 0;
const invalidationListeners = new Set<() => void>();

export function getAuthRefreshGeneration(): number {
  return authRefreshGeneration;
}

/** Drop in-flight refresh work after logout or session replacement (rapid user switch). */
export function invalidateAuthRefresh(): void {
  authRefreshGeneration += 1;
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
