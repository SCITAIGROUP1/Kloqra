const inflightGetRequests = new Map<string, Promise<unknown>>();

export function getInflightGetRequests(): Map<string, Promise<unknown>> {
  return inflightGetRequests;
}

export function clearInflightGetRequests(): void {
  inflightGetRequests.clear();
}

/** Drop in-flight GET dedupe entries whose key includes `pathFragment` (e.g. `/timelogs`). */
export function clearInflightGetRequestsForPath(pathFragment: string): void {
  if (!pathFragment) return;
  for (const key of inflightGetRequests.keys()) {
    if (key.includes(pathFragment)) {
      inflightGetRequests.delete(key);
    }
  }
}
