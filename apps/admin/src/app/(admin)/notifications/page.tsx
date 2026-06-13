"use client";

import { Skeleton } from "@kloqra/ui";
import { NotificationsPage } from "@kloqra/web-shared";
import { useSessionStore } from "@/stores/session.store";

export default function Page() {
  const workspaceId = useSessionStore((s) => s.session?.workspaceId) ?? "";
  if (!workspaceId) {
    return (
      <div className="p-6">
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }
  return <NotificationsPage workspaceId={workspaceId} />;
}
