"use client";

import { ROUTES } from "@chronomint/contracts";
import type { TimesheetPeriodDto } from "@chronomint/contracts";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from "@chronomint/ui";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface TimesheetStatusCardProps {
  statusInfo: TimesheetPeriodDto;
  onSubmitted: () => void;
  anchorDate: Date;
}

function periodLabel(info: TimesheetPeriodDto): string {
  const start = new Date(info.periodStart);
  if (info.approvalPeriod === "daily") {
    return start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  }
  if (info.approvalPeriod === "monthly") {
    return start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  return `Week of ${start.toISOString().slice(0, 10)}`;
}

function submitLabel(approvalPeriod: TimesheetPeriodDto["approvalPeriod"]): string {
  if (approvalPeriod === "daily") return "Submit Day for Approval";
  if (approvalPeriod === "monthly") return "Submit Month for Approval";
  return "Submit Week for Approval";
}

export function TimesheetStatusCard({
  statusInfo,
  onSubmitted,
  anchorDate
}: TimesheetStatusCardProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNote(statusInfo?.note || "");
  }, [statusInfo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ws) return;
    setSubmitting(true);
    setError(null);
    try {
      await api<TimesheetPeriodDto>(ROUTES.TIMESHEETS.SUBMIT, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          date: anchorDate.toISOString(),
          projectId: statusInfo.projectId,
          note: note.trim() || undefined
        })
      });
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit timesheet");
    } finally {
      setSubmitting(false);
    }
  }

  const { status, reviewNote, reviewedAt, projectName } = statusInfo;

  const statusColors = {
    DRAFT: "bg-muted text-muted-foreground border-muted-foreground/20",
    SUBMITTED:
      "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/50",
    APPROVED:
      "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900/50",
    REJECTED:
      "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50"
  };

  const statusLabels = {
    DRAFT: "Draft (Not Submitted)",
    SUBMITTED: "Submitted (Pending Approval)",
    APPROVED: "Approved",
    REJECTED: "Rejected"
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="truncate">{projectName ?? "Project"}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${statusColors[status]}`}
          >
            {statusLabels[status]}
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{periodLabel(statusInfo)}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "APPROVED" && (
          <div className="text-sm border border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/10 p-3 rounded-lg text-green-800 dark:text-green-200 space-y-1">
            <p className="font-medium text-xs">Approved</p>
            {reviewNote && <p className="text-xs italic">Note: &quot;{reviewNote}&quot;</p>}
            {reviewedAt && (
              <p className="text-[10px] opacity-75">
                Reviewed on {new Date(reviewedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {status === "REJECTED" && (
          <div className="text-sm border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10 p-3 rounded-lg text-red-800 dark:text-red-200 space-y-1">
            <p className="font-medium text-xs">Changes Requested</p>
            {reviewNote && <p className="text-xs italic">Reason: &quot;{reviewNote}&quot;</p>}
            {reviewedAt && (
              <p className="text-[10px] opacity-75">
                Reviewed on {new Date(reviewedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {status === "SUBMITTED" && (
          <div className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border">
            Submitted for review. Entries on this project in this period are locked until reviewed.
            {statusInfo.note && (
              <p className="mt-2 text-xs italic">Your note: &quot;{statusInfo.note}&quot;</p>
            )}
          </div>
        )}

        {(status === "DRAFT" || status === "REJECTED") && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`submit-note-${statusInfo.projectId}`} className="text-xs">
                Submission Note (Optional)
              </Label>
              <Input
                id={`submit-note-${statusInfo.projectId}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for your approver"
                disabled={submitting}
                className="h-8 text-xs"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" size="sm" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : submitLabel(statusInfo.approvalPeriod)}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
