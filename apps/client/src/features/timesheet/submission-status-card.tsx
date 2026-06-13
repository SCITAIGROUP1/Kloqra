"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  SubmitTimesheetResponseDto,
  TimesheetPeriodDto,
  TimesheetSubmitPreviewDto
} from "@kloqra/contracts";
import {
  AmendmentRequestDialog,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  SubmitCascadeDialog,
  cn,
  formatSubmissionPeriodLabel
} from "@kloqra/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export type SubmissionStatusCardProps = {
  statusInfo: TimesheetPeriodDto;
  onSubmitted: () => void;
  anchorDate: Date;
  highlighted?: boolean;
};

function submitButtonLabel(approvalPeriod: TimesheetPeriodDto["approvalPeriod"]): string {
  if (approvalPeriod === "daily") return "Submit day for review";
  if (approvalPeriod === "monthly") return "Submit month for review";
  return "Submit for review";
}

export function SubmissionStatusCard({
  statusInfo,
  onSubmitted,
  anchorDate,
  highlighted = false
}: SubmissionStatusCardProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [note, setNote] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [amendmentOpen, setAmendmentOpen] = useState(false);
  const [preview, setPreview] = useState<TimesheetSubmitPreviewDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amendmentSubmitting, setAmendmentSubmitting] = useState(false);

  useEffect(() => {
    setNote(statusInfo?.note || "");
  }, [statusInfo]);

  async function loadPreview() {
    if (!ws) return;
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams({
        projectId: statusInfo.projectId,
        date: anchorDate.toISOString()
      });
      const data = await api<TimesheetSubmitPreviewDto>(
        `${ROUTES.TIMESHEETS.SUBMIT_PREVIEW}?${params}`,
        { workspaceId: ws }
      );
      setPreview(data);
      setPreviewOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load submit preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function confirmSubmit() {
    if (!ws) return;
    setSubmitting(true);
    try {
      const res = await api<SubmitTimesheetResponseDto>(ROUTES.TIMESHEETS.SUBMIT, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          date: anchorDate.toISOString(),
          projectId: statusInfo.projectId,
          note: note.trim() || undefined,
          confirmCascade: true
        })
      });
      const count = res.cascadedCount + 1;
      toast.success(`Submitted ${count} period${count === 1 ? "" : "s"} for review.`);
      setPreviewOpen(false);
      onSubmitted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit timesheet");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestAmendment(reason: string) {
    if (!ws || !statusInfo.id) return;
    setAmendmentSubmitting(true);
    try {
      await api(ROUTES.TIMESHEETS.CREATE_AMENDMENT(statusInfo.id), {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ reason })
      });
      toast.success("Edit request sent to admins.");
      setAmendmentOpen(false);
      onSubmitted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send edit request");
    } finally {
      setAmendmentSubmitting(false);
    }
  }

  const { status, reviewNote, projectName, amendmentPending } = statusInfo;
  const periodLabel = formatSubmissionPeriodLabel(
    statusInfo.periodStart,
    statusInfo.approvalPeriod
  );

  const statusColors = {
    DRAFT: "bg-muted text-muted-foreground border-muted-foreground/20",
    SUBMITTED: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
    APPROVED: "bg-status-success-bg text-status-success-fg border-status-success-border",
    REJECTED: "bg-status-danger-bg text-status-danger-fg border-status-danger-border"
  };

  const statusLabels = {
    DRAFT: "Draft",
    SUBMITTED: "Pending review",
    APPROVED: "Approved",
    REJECTED: "Rejected"
  };

  return (
    <>
      <Card
        id={`submission-${statusInfo.projectId}`}
        interactive
        className={cn(
          highlighted &&
            "ring-2 ring-primary/40 ring-offset-2 ring-offset-background animate-highlight-pulse"
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="truncate">{projectName ?? "Project"}</span>
            <span className="flex items-center gap-1 shrink-0">
              {amendmentPending ? (
                <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-status-info-bg text-status-info-fg border-status-info-border transition-[background-color,border-color,color] duration-[var(--motion-base)]">
                  Edit pending
                </span>
              ) : null}
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-[background-color,border-color,color] duration-[var(--motion-base)] ${statusColors[status]}`}
              >
                {statusLabels[status]}
              </span>
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">{periodLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "REJECTED" && reviewNote && (
            <div className="text-sm border border-status-danger-border bg-status-danger-bg p-3 rounded-lg text-status-danger-fg">
              <p className="text-xs italic">Reason: &quot;{reviewNote}&quot;</p>
            </div>
          )}

          {status === "SUBMITTED" && (
            <div className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border">
              Submitted for review. Entries in this period are locked until reviewed.
            </div>
          )}

          {(status === "DRAFT" || status === "REJECTED") && !amendmentPending && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`submit-note-${statusInfo.projectId}`} className="text-xs">
                  Submission note (optional)
                </Label>
                <Input
                  id={`submit-note-${statusInfo.projectId}`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note for your approver"
                  disabled={previewLoading || submitting}
                  className="h-8 text-xs"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={previewLoading || submitting}
                onClick={() => void loadPreview()}
              >
                {previewLoading ? "Loading…" : submitButtonLabel(statusInfo.approvalPeriod)}
              </Button>
            </div>
          )}

          {(status === "SUBMITTED" || status === "APPROVED") &&
            !amendmentPending &&
            statusInfo.id && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setAmendmentOpen(true)}
              >
                Request edit
              </Button>
            )}

          <Button type="button" variant="ghost" size="sm" className="w-full h-7 text-xs" asChild>
            <Link href={`/timesheet?projectId=${statusInfo.projectId}`}>View timesheet</Link>
          </Button>
        </CardContent>
      </Card>

      <SubmitCascadeDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        preview={preview}
        loading={previewLoading}
        submitting={submitting}
        onConfirm={() => void confirmSubmit()}
      />

      <AmendmentRequestDialog
        open={amendmentOpen}
        onOpenChange={setAmendmentOpen}
        projectName={projectName ?? "Project"}
        periodLabel={periodLabel}
        submitting={amendmentSubmitting}
        onSubmit={(reason) => void requestAmendment(reason)}
      />
    </>
  );
}
