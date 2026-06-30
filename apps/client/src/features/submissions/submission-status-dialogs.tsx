"use client";

import type { TimesheetSubmitPreviewDto } from "@kloqra/contracts";
import { AmendmentRequestDialog, SubmitCascadeDialog } from "@kloqra/ui";

export type SubmissionStatusDialogsProps = {
  previewOpen: boolean;
  onPreviewOpenChange: (open: boolean) => void;
  preview: TimesheetSubmitPreviewDto | null;
  previewLoading: boolean;
  submitting: boolean;
  onConfirmSubmit: () => void;
  amendmentOpen: boolean;
  onAmendmentOpenChange: (open: boolean) => void;
  projectName: string;
  periodLabel: string;
  amendmentSubmitting: boolean;
  onRequestAmendment: (reason: string) => void;
};

export function SubmissionStatusDialogs({
  previewOpen,
  onPreviewOpenChange,
  preview,
  previewLoading,
  submitting,
  onConfirmSubmit,
  amendmentOpen,
  onAmendmentOpenChange,
  projectName,
  periodLabel,
  amendmentSubmitting,
  onRequestAmendment
}: SubmissionStatusDialogsProps) {
  return (
    <>
      <SubmitCascadeDialog
        open={previewOpen}
        onOpenChange={onPreviewOpenChange}
        preview={preview}
        loading={previewLoading}
        submitting={submitting}
        onConfirm={onConfirmSubmit}
      />

      <AmendmentRequestDialog
        open={amendmentOpen}
        onOpenChange={onAmendmentOpenChange}
        projectName={projectName}
        periodLabel={periodLabel}
        submitting={amendmentSubmitting}
        onSubmit={onRequestAmendment}
      />
    </>
  );
}
