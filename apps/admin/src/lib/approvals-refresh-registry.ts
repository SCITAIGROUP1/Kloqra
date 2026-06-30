const handlers = new Set<() => void>();

export function registerApprovalsRefreshHandler(handler: () => void): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function triggerApprovalsRefresh(): void {
  for (const handler of handlers) {
    handler();
  }
}
