"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  SubmitTimesheetResponseDto,
  TimesheetPeriodDto,
  TimesheetSubmitPreviewDto
} from "@kloqra/contracts";
import { formatSubmissionPeriodLabel } from "@kloqra/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useIsImpersonating } from "@/hooks/use-is-impersonating";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function submitButtonLabel(approvalPeriod: TimesheetPeriodDto["approvalPeriod"]): string {
  if (approvalPeriod === "daily") return "Submit day";
  if (approvalPeriod === "monthly") return "Submit month";
  return "Submit";
}

export function useSubmissionStatusActions(
  statusInfo: TimesheetPeriodDto,
  anchorDate: Date,
  onSubmitted: () => void
) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const isImpersonating = useIsImpersonating();
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
      await api<SubmitTimesheetResponseDto>(ROUTES.TIMESHEETS.SUBMIT, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          date: anchorDate.toISOString(),
          projectId: statusInfo.projectId,
          note: note.trim() || undefined
        })
      });
      toast.success("Submitted for review.");
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

  const periodLabel = formatSubmissionPeriodLabel(
    statusInfo.periodStart,
    statusInfo.approvalPeriod
  );

  return {
    note,
    setNote,
    previewOpen,
    setPreviewOpen,
    amendmentOpen,
    setAmendmentOpen,
    preview,
    previewLoading,
    submitting,
    amendmentSubmitting,
    loadPreview,
    confirmSubmit,
    requestAmendment,
    periodLabel,
    projectName: statusInfo.projectName ?? "Project",
    status: statusInfo.status,
    reviewNote: statusInfo.reviewNote,
    amendmentPending: Boolean(statusInfo.amendmentPending),
    canSubmit:
      !isImpersonating &&
      (statusInfo.status === "DRAFT" || statusInfo.status === "REJECTED") &&
      !statusInfo.amendmentPending,
    canRequestEdit:
      !isImpersonating &&
      (statusInfo.status === "SUBMITTED" || statusInfo.status === "APPROVED") &&
      !statusInfo.amendmentPending &&
      Boolean(statusInfo.id)
  };
}
