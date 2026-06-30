"use client";

import type { PendingTimesheetDto } from "@kloqra/contracts";
import { Button, ConfirmNoteDialog, Skeleton } from "@kloqra/ui";
import { Check, X, Calendar, User } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { usePendingTimesheets } from "@/features/approvals/use-pending-timesheets";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

type ReviewTarget = {
  sheet: PendingTimesheetDto;
  action: "approve" | "reject";
};

export type PendingTimesheetsWidgetProps = {
  onHeaderActions?: (actions: React.ReactNode) => void;
  projectId?: string | string[];
  userId?: string | string[];
};

export function PendingTimesheetsWidget({
  onHeaderActions,
  projectId,
  userId
}: PendingTimesheetsWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { pending, loading, actioningId, handleReview } = usePendingTimesheets(ws, {});
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);

  const filteredTimesheets = useMemo(() => {
    return pending.filter((sheet) => {
      if (projectId) {
        const pIds = Array.isArray(projectId) ? projectId : [projectId];
        if (pIds.length > 0 && !pIds.includes(sheet.projectId)) {
          return false;
        }
      }
      if (userId) {
        const uIds = Array.isArray(userId) ? userId : [userId];
        if (uIds.length > 0 && !uIds.includes(sheet.userId)) {
          return false;
        }
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
      day: "numeric",
      timeZone: "UTC"
    });
  }

  function formatDateRange(startStr: string, endStr: string) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
  }

  function getPeriodLabel(sheet: PendingTimesheetDto) {
    return sheet.approvalPeriod === "daily"
      ? "Day"
      : sheet.approvalPeriod === "monthly"
        ? "Month"
        : "Week";
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 py-6">
        <Skeleton className="h-20 w-full max-w-xs rounded-lg" />
        <p className="text-sm text-muted-foreground">Loading pending queue…</p>
      </div>
    );
  }

  const periodRangeStr = reviewTarget
    ? `${getPeriodLabel(reviewTarget.sheet)}: ${formatDateRange(reviewTarget.sheet.periodStart, reviewTarget.sheet.periodEnd)}`
    : "";

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
                    {sheet.submittedAt ? (
                      <p className="text-[9px] text-muted-foreground/80 mt-0.5 truncate">
                        Submitted:{" "}
                        <span className="font-medium text-foreground">
                          {new Date(sheet.submittedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "UTC"
                          })}
                        </span>
                      </p>
                    ) : null}
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
                    onClick={() => setReviewTarget({ sheet, action: "reject" })}
                    className="h-7 text-[10px] gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  >
                    <X className="size-3" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={actioningId !== null}
                    onClick={() => setReviewTarget({ sheet, action: "approve" })}
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
          <Link href="/approvals?tab=review">Open Approvals</Link>
        </Button>
      </div>

      {reviewTarget ? (
        <ConfirmNoteDialog
          open
          onOpenChange={(open) => {
            if (!open) setReviewTarget(null);
          }}
          title={
            reviewTarget.action === "approve" ? "Approve this timesheet?" : "Reject this timesheet?"
          }
          description={
            reviewTarget.action === "approve"
              ? `Approve ${reviewTarget.sheet.userName}'s submission for ${reviewTarget.sheet.projectName} (${periodRangeStr})?`
              : `Send ${reviewTarget.sheet.userName}'s submission for ${reviewTarget.sheet.projectName} (${periodRangeStr}) back for correction.`
          }
          noteLabel={reviewTarget.action === "approve" ? "Review comment" : "Rejection reason"}
          notePlaceholder={
            reviewTarget.action === "approve"
              ? "Optional feedback for the member"
              : "Explain what needs to be corrected"
          }
          noteRequired={reviewTarget.action === "reject"}
          destructive={reviewTarget.action === "reject"}
          confirmLabel={
            reviewTarget.action === "approve" ? "Approve timesheet" : "Reject timesheet"
          }
          submitting={actioningId === reviewTarget.sheet.id}
          onConfirm={(note) => {
            void handleReview(reviewTarget.sheet.id, reviewTarget.action, note).then(() =>
              setReviewTarget(null)
            );
          }}
        />
      ) : null}
    </div>
  );
}

export default PendingTimesheetsWidget;
