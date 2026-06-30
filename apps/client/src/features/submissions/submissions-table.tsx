"use client";

import type { ProjectDto, TimesheetPeriodDto } from "@kloqra/contracts";
import {
  Button,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Input,
  ProjectColorDot,
  Table,
  TableBody,
  TableHeader,
  TableRow,
  TimesheetApprovalStatusBadge,
  cn
} from "@kloqra/ui";
import { buildMemberTimesheetHrefFromSubmission } from "@kloqra/web-shared";
import Link from "next/link";
import { useMemo } from "react";
import { SubmissionStatusDialogs } from "./submission-status-dialogs";
import { submitButtonLabel, useSubmissionStatusActions } from "./use-submission-status-actions";

export type SubmissionsTableProps = {
  submissions: TimesheetPeriodDto[];
  projects?: ProjectDto[];
  onSubmitted: () => void;
  highlightedProjectId?: string;
};

function SubmissionTableRow({
  statusInfo,
  projectColor,
  onSubmitted,
  highlighted
}: {
  statusInfo: TimesheetPeriodDto;
  projectColor?: string;
  onSubmitted: () => void;
  highlighted?: boolean;
}) {
  const actions = useSubmissionStatusActions(
    statusInfo,
    new Date(statusInfo.periodStart),
    onSubmitted
  );

  const timesheetHref = useMemo(
    () => buildMemberTimesheetHrefFromSubmission(statusInfo),
    [statusInfo]
  );

  return (
    <>
      <TableRow
        id={`submission-row-${statusInfo.projectId}`}
        className={cn(
          highlighted && "bg-primary/5 ring-1 ring-inset ring-primary/30 animate-highlight-pulse"
        )}
      >
        <DataTableCell className="whitespace-nowrap font-medium">
          {actions.periodLabel}
        </DataTableCell>
        <DataTableCell>
          <div className="flex max-w-[220px] items-center gap-1.5 truncate">
            <ProjectColorDot
              color={projectColor ?? "var(--muted)"}
              size="sm"
              className="shrink-0"
            />
            <span className="truncate">{actions.projectName}</span>
          </div>
        </DataTableCell>
        <DataTableCell>
          <div className="flex flex-wrap items-center gap-1.5">
            <TimesheetApprovalStatusBadge status={actions.status} />
            {actions.amendmentPending ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-status-info-bg text-status-info-fg border-status-info-border">
                Edit pending
              </span>
            ) : null}
          </div>
        </DataTableCell>
        <DataTableCell className="max-w-[220px]">
          {actions.status === "REJECTED" && actions.reviewNote ? (
            <p className="text-xs text-status-danger-fg line-clamp-2">
              &quot;{actions.reviewNote}&quot;
            </p>
          ) : actions.canSubmit ? (
            <Input
              value={actions.note}
              onChange={(e) => actions.setNote(e.target.value)}
              placeholder="Optional note for approver"
              disabled={actions.previewLoading || actions.submitting}
              className="h-8 text-xs"
            />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </DataTableCell>
        <DataTableCell className="text-right">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {actions.canSubmit ? (
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs"
                disabled={actions.previewLoading || actions.submitting}
                onClick={() => void actions.loadPreview()}
              >
                {actions.previewLoading ? "Loading…" : submitButtonLabel(statusInfo.approvalPeriod)}
              </Button>
            ) : null}
            {actions.canRequestEdit ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => actions.setAmendmentOpen(true)}
              >
                Request edit
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href={timesheetHref}>View timesheet</Link>
            </Button>
          </div>
        </DataTableCell>
      </TableRow>

      <SubmissionStatusDialogs
        previewOpen={actions.previewOpen}
        onPreviewOpenChange={actions.setPreviewOpen}
        preview={actions.preview}
        previewLoading={actions.previewLoading}
        submitting={actions.submitting}
        onConfirmSubmit={() => void actions.confirmSubmit()}
        amendmentOpen={actions.amendmentOpen}
        onAmendmentOpenChange={actions.setAmendmentOpen}
        projectName={actions.projectName}
        periodLabel={actions.periodLabel}
        amendmentSubmitting={actions.amendmentSubmitting}
        onRequestAmendment={(reason) => void actions.requestAmendment(reason)}
      />
    </>
  );
}

export function SubmissionsTable({
  submissions,
  projects = [],
  onSubmitted,
  highlightedProjectId
}: SubmissionsTableProps) {
  const projectColorById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.color])),
    [projects]
  );

  return (
    <div className="rounded-lg border border-border/60 overflow-x-auto animate-fade-in motion-reduce:animate-none">
      <Table className="text-sm">
        <TableHeader>
          <DataTableHeaderRow>
            <DataTableHead>Period</DataTableHead>
            <DataTableHead>Project</DataTableHead>
            <DataTableHead>Status</DataTableHead>
            <DataTableHead>Note / feedback</DataTableHead>
            <DataTableHead className="text-right">Actions</DataTableHead>
          </DataTableHeaderRow>
        </TableHeader>
        <TableBody>
          {submissions.map((sub) => {
            const highlighted = highlightedProjectId === sub.projectId;
            return (
              <SubmissionTableRow
                key={`${sub.projectId}:${sub.periodStart}`}
                statusInfo={sub}
                projectColor={projectColorById.get(sub.projectId)}
                onSubmitted={onSubmitted}
                highlighted={highlighted}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
