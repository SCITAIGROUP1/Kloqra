import { useSessionStore } from "@/stores/session.store";

export function useIsImpersonating(): boolean {
  return Boolean(useSessionStore((s) => s.session?.impersonatorId));
}
