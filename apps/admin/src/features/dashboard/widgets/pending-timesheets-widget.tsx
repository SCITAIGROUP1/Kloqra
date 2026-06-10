"use client";

import { Button } from "@kloqra/ui";
import { Check, X, Calendar, User } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useMemo } from "react";
import { usePendingTimesheets } from "@/features/approvals/use-pending-timesheets";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface PendingTimesheetsWidgetProps {
  onHeaderActions?: (actions: React.ReactNode) => void;
  projectId?: string;
  userId?: string;
}

export function PendingTimesheetsWidget({
  onHeaderActions,
  projectId,
  userId
}: PendingTimesheetsWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { pending, loading, actioningId, handleReview } = usePendingTimesheets(ws);

  const filteredTimesheets = useMemo(() => {
    return pending.filter((sheet) => {
      if (projectId && sheet.projectId !== projectId) {
        return false;
      }
      if (userId && sheet.userId !== userId) {
        return false;
      }
      return true;
    });
  }, [pending, projectId, userId]);

  useEffect(() => {
    if (onHeaderActions) {
      const count = filteredTimesheets.length;
      if (count > 0) {
        onHeaderActions(
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500 text-amber-950 border border-amber-400">
            {count} Pending
          </span>
        );
      } else {
        onHeaderActions(null);
      }
    }
  }, [filteredTimesheets.length, onHeaderActions]);

  function formatDate(isoStr: string) {
    return new Date(isoStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground animate-pulse py-6">
        Loading pending queue...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-2 pr-1 flex-1 overflow-auto max-h-[300px]">
        {filteredTimesheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <Check className="size-8 text-green-500 mb-2 stroke-[2.5px] p-1.5 bg-green-500/10 rounded-full" />
            <p className="text-xs font-semibold">Queue is clear!</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              All submitted timesheets are approved or reviewed.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredTimesheets.map((sheet) => (
              <div
                key={sheet.id}
                className="flex flex-col gap-2 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-background/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <User className="size-3 text-muted-foreground" />
                      {sheet.userName}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      Project:{" "}
                      <span className="font-medium text-foreground">{sheet.projectName}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-primary font-mono block">
                      {sheet.totalHours.toFixed(1)} hrs
                    </span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-1 font-mono">
                      <Calendar className="size-2.5" />
                      {formatDate(sheet.periodStart)} - {formatDate(sheet.periodEnd)}
                    </span>
                  </div>
                </div>

                {sheet.note && (
                  <p className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded border border-border/20 italic">
                    &quot;{sheet.note}&quot;
                  </p>
                )}

                <div className="flex justify-end gap-1.5 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actioningId !== null}
                    onClick={() => void handleReview(sheet.id, "reject")}
                    className="h-7 text-[10px] gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  >
                    <X className="size-3" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={actioningId !== null}
                    onClick={() => void handleReview(sheet.id, "approve")}
                    className="h-7 text-[10px] gap-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="size-3" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="pt-2 border-t border-border/40 mt-2">
        <Button variant="ghost" size="sm" className="w-full h-7 text-[10px]" asChild>
          <Link href="/approvals">Open Approvals</Link>
        </Button>
      </div>
    </div>
  );
}

export default PendingTimesheetsWidget;
