"use client";

import type { ProjectDto, TimesheetPeriodDto, TimeLogDto } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
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
  ConfirmDialog,
  cn
} from "@kloqra/ui";
import {
  buildMemberTimesheetHrefFromSubmission,
  commitTimelogMutation,
  useTimelogListQuery
} from "@kloqra/web-shared";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { TimeTrackerEntryActions } from "../time-tracker/time-tracker-entry-actions";
import { TimeEntryDialog, draftFromLog, type TimeEntryDraft } from "../timesheet/time-entry-dialog";
import { draftToIsoRange, canSaveTaskDraft } from "../timesheet/time-entry-draft";
import { validateTimeEntryOverlap } from "../timesheet/validate-time-entry-overlap";
import { SubmissionStatusDialogs } from "./submission-status-dialogs";
import { submitButtonLabel, useSubmissionStatusActions } from "./use-submission-status-actions";
import { useTimelogStaleRefetch } from "@/hooks/use-timelog-stale-refetch";
import { api } from "@/lib/api";
import { useProjectsStore } from "@/stores/projects.store";

export type SubmissionsTableProps = {
  submissions: TimesheetPeriodDto[];
  projects?: ProjectDto[];
  onSubmitted: () => void;
  highlightedProjectId?: string;
  workspaceId: string;
  timezone: string;
};

function formatLogDuration(durationSec: number): string {
  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function formatLogTimeRange(startTime: string, endTime: string, timezone?: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const tzOpts = timezone ? { timeZone: timezone } : {};
  const sameDay =
    start.toLocaleDateString(undefined, tzOpts) === end.toLocaleDateString(undefined, tzOpts);
  if (sameDay) {
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", ...tzOpts })} · ${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", ...tzOpts })} – ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", ...tzOpts })}`;
  }
  return `${start.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", ...tzOpts })} – ${end.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", ...tzOpts })}`;
}

function SubmissionRowLogs({
  submission,
  workspaceId,
  timezone,
  onLogUpdated,
  isLocked
}: {
  submission: TimesheetPeriodDto;
  workspaceId: string;
  timezone: string;
  onLogUpdated: () => void;
  isLocked: boolean;
}) {
  const logsPath = useMemo(() => {
    const params = new URLSearchParams({
      userId: submission.userId,
      projectId: submission.projectId,
      from: submission.periodStart,
      to: submission.periodEnd
    });
    return `${ROUTES.TIMELOGS.LIST}?${params.toString()}`;
  }, [submission]);

  const {
    data: logsData,
    refetch: refetchLogs,
    isLoading: loading,
    error: logsQueryError
  } = useTimelogListQuery(workspaceId, logsPath, Boolean(workspaceId));

  const logs = logsData?.items ?? [];

  useEffect(() => {
    if (!logsQueryError) return;
    toast.error("Failed to load logs for this period");
  }, [logsQueryError]);

  const [editingLog, setEditingLog] = useState<TimeLogDto | null>(null);
  const [draft, setDraft] = useState<TimeEntryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteLog, setConfirmDeleteLog] = useState<TimeLogDto | null>(null);

  const tasks = useProjectsStore((s) => s.tasks);
  const projects = useProjectsStore((s) => s.projects);
  const workspaceNamesById = useProjectsStore((s) => s.workspaceNamesById);

  const refreshLogs = useCallback(async () => {
    await refetchLogs();
  }, [refetchLogs]);

  useTimelogStaleRefetch(
    workspaceId,
    () => {
      void refreshLogs();
    },
    Boolean(workspaceId)
  );

  const taskLabel = useCallback(
    (id: string) => tasks.find((t) => t.id === id)?.taskName ?? "Task",
    [tasks]
  );

  const openEdit = (log: TimeLogDto) => {
    setEditingLog(log);
    setDraft(draftFromLog(log, tasks, timezone));
    setError(null);
  };

  const closeDialog = () => {
    setEditingLog(null);
    setDraft(null);
    setError(null);
  };

  async function saveEntry() {
    if (!draft || !canSaveTaskDraft(draft)) {
      setError("Select a project and a task.");
      return;
    }
    const { startTime, endTime } = draftToIsoRange(draft, timezone);
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }
    const overlapMsg = await validateTimeEntryOverlap(
      workspaceId,
      start,
      end,
      timezone,
      editingLog?.id
    );
    if (overlapMsg) {
      setError(overlapMsg);
      toast.error(overlapMsg);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const taskId = draft.taskSelection;
      const body = {
        taskId,
        startTime,
        endTime,
        description: draft.description || undefined,
        isBillable: draft.isBillable
      };
      if (editingLog) {
        const updated = await api<TimeLogDto>(`/timelogs/${editingLog.id}`, {
          method: "PATCH",
          workspaceId,
          body: JSON.stringify(body)
        });
        toast.success("Time entry updated!");
        closeDialog();
        await commitTimelogMutation(workspaceId, refreshLogs, { type: "upsert", log: updated });
      }
      onLogUpdated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save entry";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const target = confirmDeleteLog;
    setConfirmDeleteLog(null);
    if (!target) return;
    setSaving(true);
    try {
      await api(`/timelogs/${target.id}`, { method: "DELETE", workspaceId });
      toast.success("Time entry deleted!");
      await commitTimelogMutation(workspaceId, refreshLogs, {
        type: "remove",
        logId: target.id
      });
      onLogUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-muted/10 p-4 border-t border-b border-border/40">
      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Logged entries in this period:
      </h4>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading time entries...</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No entries found for this project in this period.
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const task = tasks.find((t) => t.id === log.taskId);
            return (
              <div
                key={log.id}
                className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-background/80 transition-colors"
              >
                <div className="space-y-1.5 text-left min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-xs font-semibold text-foreground">
                      {task?.taskName ?? "Task"}
                    </p>
                    {log.isBillable ? (
                      <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0 text-[9px] font-medium uppercase tracking-wide text-primary">
                        Billable
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-border/70 bg-muted/50 px-1.5 py-0 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                        Non-billable
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {formatLogTimeRange(log.startTime, log.endTime, timezone)} ·{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatLogDuration(log.durationSec)}
                    </span>
                  </p>
                  {log.description && (
                    <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                      &quot;{log.description}&quot;
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center">
                  <TimeTrackerEntryActions
                    log={log}
                    locked={isLocked}
                    onEdit={openEdit}
                    onDelete={setConfirmDeleteLog}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TimeEntryDialog
        open={editingLog !== null}
        title={isLocked ? "View time entry" : "Edit time entry"}
        draft={draft}
        projects={projects}
        tasks={tasks}
        taskLabel={taskLabel}
        workspaceNames={workspaceNamesById}
        editingLog={editingLog}
        saving={saving}
        error={error}
        workspaceId={workspaceId}
        onClose={closeDialog}
        onDraftChange={setDraft}
        onSave={saveEntry}
        timezone={timezone}
        readOnly={isLocked}
      />

      <ConfirmDialog
        open={confirmDeleteLog !== null}
        title="Delete this entry?"
        description="This can't be undone."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteLog(null)}
      />
    </div>
  );
}

function SubmissionTableRow({
  statusInfo,
  projectColor,
  onSubmitted,
  highlighted,
  workspaceId,
  timezone
}: {
  statusInfo: TimesheetPeriodDto;
  projectColor?: string;
  onSubmitted: () => void;
  highlighted?: boolean;
  workspaceId: string;
  timezone: string;
}) {
  const [expanded, setExpanded] = useState(false);

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
        <DataTableCell className="w-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </Button>
        </DataTableCell>
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

      {expanded && (
        <TableRow className="bg-muted/5 hover:bg-muted/5">
          <DataTableCell colSpan={6} className="p-0 border-t border-b border-border/40">
            <SubmissionRowLogs
              submission={statusInfo}
              workspaceId={workspaceId}
              timezone={timezone}
              onLogUpdated={onSubmitted}
              isLocked={!actions.canSubmit}
            />
          </DataTableCell>
        </TableRow>
      )}

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
  highlightedProjectId,
  workspaceId,
  timezone
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
            <DataTableHead className="w-8"></DataTableHead>
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
                workspaceId={workspaceId}
                timezone={timezone}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
