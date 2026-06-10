"use client";

import { ROUTES } from "@kloqra/contracts";
import type { PresenceSnapshotDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

/**
 * Shows a pulsing green indicator with "N tracking now" text.
 * Polls the snapshot endpoint every 30 s.
 */
export function LivePresenceBadge() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [count, setCount] = useState<number | null>(null);
  const [names, setNames] = useState<string[]>([]);

  const refresh = useCallback(() => {
    if (!ws) return;
    api<PresenceSnapshotDto>(ROUTES.PRESENCE.SNAPSHOT, { workspaceId: ws })
      .then((snap) => {
        setCount(snap.members.length);
        setNames(snap.members.slice(0, 3).map((m) => m.userName));
      })
      .catch(() => {});
  }, [ws]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (count === null || count === 0) return null;

  const tooltip =
    count === 1
      ? `${names[0]} is tracking now`
      : count <= 3
        ? `${names.join(", ")} are tracking now`
        : `${names.slice(0, 2).join(", ")} and ${count - 2} more are tracking now`;

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5"
      title={tooltip}
      aria-label={tooltip}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 tabular-nums">
        {count} tracking now
      </span>
    </div>
  );
}
