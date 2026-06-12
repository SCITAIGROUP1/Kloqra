"use client";

import { NotificationsPage } from "@kloqra/web-shared";
import { useSessionStore } from "@/stores/session.store";

export default function Page() {
  const workspaceId = useSessionStore((s) => s.session?.workspaceId) ?? "";
  if (!workspaceId) {
    return <div className="h-96 animate-pulse rounded-xl bg-muted" />;
  }
  return <NotificationsPage workspaceId={workspaceId} />;
}
