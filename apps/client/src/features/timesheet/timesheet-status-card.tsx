"use client";

import { ROUTES } from "@kloqra/contracts";
import type { TimesheetPeriodDto } from "@kloqra/contracts";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from "@kloqra/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface TimesheetStatusCardProps {
  statusInfo: TimesheetPeriodDto;
  onSubmitted: () => void;
  anchorDate: Date;
  submitLabelOverride?: string;
}

function periodLabel(info: TimesheetPeriodDto): string {
  const start = new Date(info.periodStart);
  if (info.approvalPeriod === "daily") {
    return start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    });
  }
  if (info.approvalPeriod === "monthly") {
    return start.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
  }
  return `Week of ${start.toISOString().slice(0, 10)}`;
}

function submitLabel(approvalPeriod: TimesheetPeriodDto["approvalPeriod"]): string {
  if (approvalPeriod === "daily") return "Send Day to Approvals";
  if (approvalPeriod === "monthly") return "Send Month to Approvals";
  return "Send to Approvals";
}

export function TimesheetStatusCard({
  statusInfo,
  onSubmitted,
  anchorDate,
  submitLabelOverride
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
      toast.success("Timesheet submitted for approval.");
      onSubmitted();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to submit timesheet";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const { status, reviewNote, reviewedAt, projectName } = statusInfo;

  const statusColors = {
    DRAFT: "bg-muted text-muted-foreground border-muted-foreground/20",
    SUBMITTED: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
    APPROVED: "bg-status-success-bg text-status-success-fg border-status-success-border",
    REJECTED: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
    WAIVED: "bg-muted text-muted-foreground border-muted-foreground/20"
  };

  const statusLabels = {
    DRAFT: "Draft (Not Submitted)",
    SUBMITTED: "Submitted (Pending Approval)",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    WAIVED: "Waived"
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
          <div className="text-sm border border-status-success-border bg-status-success-bg p-3 rounded-lg text-status-success-fg space-y-1">
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
          <div className="text-sm border border-status-danger-border bg-status-danger-bg p-3 rounded-lg text-status-danger-fg space-y-1">
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
              {submitting
                ? "Sending..."
                : (submitLabelOverride ?? submitLabel(statusInfo.approvalPeriod))}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
