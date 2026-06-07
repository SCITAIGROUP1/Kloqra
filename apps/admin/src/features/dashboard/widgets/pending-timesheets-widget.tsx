"use client";

import type { PendingTimesheetDto } from "@chronomint/contracts";
import { ROUTES } from "@chronomint/contracts";
import { Button } from "@chronomint/ui";
import { Check, X, Calendar, User } from "lucide-react";
import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface PendingTimesheetsWidgetProps {
  onHeaderActions?: (actions: React.ReactNode) => void;
}

export function PendingTimesheetsWidget({ onHeaderActions }: PendingTimesheetsWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [timesheets, setTimesheets] = useState<PendingTimesheetDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    if (!ws) return;
    try {
      const res = await api<PendingTimesheetDto[]>(ROUTES.TIMESHEETS.LIST_PENDING, {
        workspaceId: ws
      });
      // Sort: submittedAt ascending (oldest first)
      const sorted = [...res].sort((a, b) => {
        const da = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const db = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return da - db;
      });
      setTimesheets(sorted);
    } catch {
      setError("Failed to load pending timesheets");
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    void fetchPending();
  }, [fetchPending]);

  // Report pending count up to dashboard header actions
  useEffect(() => {
    if (onHeaderActions) {
      const count = timesheets.length;
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
  }, [timesheets.length, onHeaderActions]);

  const handleApprove = async (id: string, name: string) => {
    setActioningId(id);
    try {
      await api(ROUTES.TIMESHEETS.APPROVE(id), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({ reviewNote: "" })
      });
      toast.success(`Approved timesheet for ${name}`);
      await fetchPending();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve timesheet");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    setActioningId(id);
    try {
      await api(ROUTES.TIMESHEETS.REJECT(id), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({ reviewNote: "" })
      });
      toast.success(`Rejected timesheet for ${name}`);
      await fetchPending();
    } catch (e: any) {
      toast.error(e.message || "Failed to reject timesheet");
    } finally {
      setActioningId(null);
    }
  };

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

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive font-medium py-6">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2 pr-1 h-full overflow-auto max-h-[300px]">
      {timesheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <Check className="size-8 text-green-500 mb-2 stroke-[2.5px] p-1.5 bg-green-500/10 rounded-full" />
          <p className="text-xs font-semibold">Queue is clear!</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            All submitted timesheets are approved or reviewed.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {timesheets.map((sheet) => (
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
                  onClick={() => handleReject(sheet.id, sheet.userName)}
                  className="h-7 text-[10px] gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                >
                  <X className="size-3" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  disabled={actioningId !== null}
                  onClick={() => handleApprove(sheet.id, sheet.userName)}
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
  );
}

export default PendingTimesheetsWidget;
