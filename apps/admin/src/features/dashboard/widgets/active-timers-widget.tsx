"use client";

import { ROUTES } from "@kloqra/contracts";
import type { ActiveTimerCountDto } from "@kloqra/contracts";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface ActiveTimersWidgetProps {
  projectFilterName?: string;
  userId?: string;
}

export function ActiveTimersWidget({ projectFilterName, userId }: ActiveTimersWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [data, setData] = useState<ActiveTimerCountDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    if (!data) return [];
    return data.members.filter((m) => {
      if (projectFilterName && m.projectName !== projectFilterName) {
        return false;
      }
      if (userId && m.userId !== userId) {
        return false;
      }
      return true;
    });
  }, [data, projectFilterName, userId]);

  const fetchActiveCount = useCallback(async () => {
    if (!ws) return;
    try {
      const res = await api<ActiveTimerCountDto>(ROUTES.TIMER.ACTIVE_COUNT, {
        workspaceId: ws
      });
      setData(res);
    } catch {
      setError("Failed to load active timers");
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    void fetchActiveCount();
    const interval = setInterval(fetchActiveCount, 10_000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchActiveCount]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground animate-pulse py-6">
        Syncing active timers...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive font-medium py-6">
        {error || "No data"}
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between h-full min-h-[100px]">
      <div className="flex items-center gap-3">
        <div className="relative flex size-3 shrink-0">
          {filteredMembers.length > 0 && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex size-3 rounded-full ${filteredMembers.length > 0 ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
          />
        </div>
        <div>
          <p className="text-3xl font-bold tracking-tight tabular-nums leading-none">
            {filteredMembers.length}
          </p>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">
            Running Timers
          </p>
        </div>
      </div>

      {filteredMembers.length > 0 ? (
        <div className="mt-3 border-t border-border/30 pt-2 flex-1 overflow-auto max-h-[100px] pr-1">
          <div className="flex flex-col gap-1.5">
            {filteredMembers.map((m, idx) => (
              <div
                key={idx}
                className="text-[10px] text-muted-foreground flex items-center justify-between gap-2"
              >
                <span className="font-semibold text-foreground truncate max-w-[60%]">
                  {m.userName}
                </span>
                <span className="truncate max-w-[40%] text-right font-mono text-[9px] bg-muted/50 px-1 rounded border border-border/20">
                  {m.projectName || "No project"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/50 mt-3 pt-2 border-t border-border/30 italic">
          No active timers in workspace.
        </p>
      )}
    </div>
  );
}

export default ActiveTimersWidget;
