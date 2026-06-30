"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  PendingTimesheetDto,
  ListTimeLogsResponseDto,
  ListTimelogAuditEventsResponseDto,
  TaskListItemDto,
  TimeLogDto
} from "@kloqra/contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmNoteDialog,
  TimeEntryAuditEventList,
  type TimeEntryAuditEvent,
  cn
} from "@kloqra/ui";
import { fetchListItems } from "@kloqra/web-shared";
import { Calendar, Check, MessageSquare, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  formatEntryDuration,
  formatEntryTimeRange,
  mergeAuditEvents,
  sortLogsByStartDesc
} from "./period-entry-activity.utils";
import { api } from "@/lib/api";

function formatDateRange(startStr: string, endStr: string, timezone?: string) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: timezone ?? "UTC" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: timezone ?? "UTC" })}`;
}

function periodHeading(t: PendingTimesheetDto) {
  const label =
    t.approvalPeriod === "daily" ? "Day" : t.approvalPeriod === "monthly" ? "Month" : "Week";
  return `${t.projectName} · ${label}: ${formatDateRange(t.periodStart, t.periodEnd)}`;
}

function PendingActivity({
  item,
  workspaceId,
  timezone
}: {
  item: Pick<
    PendingTimesheetDto,
    "id" | "userId" | "projectId" | "projectName" | "periodStart" | "periodEnd"
  >;
  workspaceId: string;
  timezone?: string;
}) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<TimeLogDto[]>([]);
  const [auditEvents, setAuditEvents] = useState<TimeEntryAuditEvent[]>([]);
  const [tasks, setTasks] = useState<TaskListItemDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !workspaceId) return;

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      userId: item.userId,
      projectId: item.projectId,
      from: item.periodStart,
      to: item.periodEnd
    });

    void Promise.all([
      fetchListItems<TaskListItemDto>(ROUTES.TASKS.LIST, {
        workspaceId,
        filters: { projectId: item.projectId }
      }),
      api<ListTimeLogsResponseDto>(`${ROUTES.TIMELOGS.LIST}?${params}`, { workspaceId })
    ])
      .then(async ([fetchedTasks, res]) => {
        if (cancelled) return;

        const periodLogs = sortLogsByStartDesc(res.items);
        setTasks(fetchedTasks);
        setLogs(periodLogs);

        const visibleForAudit = periodLogs.slice(0, 8);
        const auditByLog = await Promise.all(
          visibleForAudit.map((log) =>
            api<ListTimelogAuditEventsResponseDto>(ROUTES.TIMELOGS.AUDIT_EVENTS(log.id), {
              workspaceId
            })
              .then((response) => response.items)
              .catch(() => [])
          )
        );

        if (!cancelled) {
          setAuditEvents(mergeAuditEvents(auditByLog));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, workspaceId, item]);

  const visibleLogs = logs.slice(0, 8);
  const hiddenLogCount = Math.max(0, logs.length - visibleLogs.length);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs px-0"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide entry activity" : "View entry activity"}
      </Button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-[var(--motion-base)] ease-[var(--motion-ease-out)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 max-h-48 overflow-y-auto pr-1 pt-2">
            {loading ? (
              <p className="text-xs text-muted-foreground">Loading entry activity…</p>
            ) : logs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No entries in this period.</p>
            ) : auditEvents.length > 0 ? (
              <TimeEntryAuditEventList
                events={auditEvents}
                tasks={tasks}
                projects={[{ id: item.projectId, name: item.projectName }]}
              />
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Logged entries in this submission:</p>
                <ul className="space-y-2">
                  {visibleLogs.map((log) => {
                    const task = tasks.find((entry) => entry.id === log.taskId);
                    return (
                      <li
                        key={log.id}
                        className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-relaxed"
                      >
                        <p className="font-medium">{task?.taskName ?? "Task"}</p>
                        <p className="text-muted-foreground">
                          {formatEntryTimeRange(log.startTime, log.endTime, timezone)} ·{" "}
                          {formatEntryDuration(log.durationSec)} ·{" "}
                          {log.isBillable ? "billable" : "non-billable"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                {hiddenLogCount > 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    +{hiddenLogCount} more {hiddenLogCount === 1 ? "entry" : "entries"}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { PendingActivity };

export interface PendingTimesheetCardProps {
  item: PendingTimesheetDto;
  workspaceId: string;
  onReview: (action: "approve" | "reject", reviewNote: string) => void;
  actioning: boolean;
  highlighted?: boolean;
  timezone?: string;
}

export function PendingTimesheetCard({
  item,
  workspaceId,
  onReview,
  actioning,
  highlighted = false,
  timezone
}: PendingTimesheetCardProps) {
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);
  const blockedByAmendment = Boolean(item.amendmentPending);
  const batchLabel =
    item.cascadedCount && item.cascadedCount > 0
      ? `Part of batch submit (+${item.cascadedCount})`
      : null;
  const periodLabel =
    item.approvalPeriod === "daily" ? "Day" : item.approvalPeriod === "monthly" ? "Month" : "Week";
  const periodRangeStr = `${periodLabel}: ${formatDateRange(item.periodStart, item.periodEnd, timezone)}`;

  function closeDialog() {
    setConfirmAction(null);
  }

  return (
    <>
      <Card
        id={`pending-${item.id}`}
        interactive
        className={cn(
          "border-primary/10 flex flex-col justify-between",
          highlighted &&
            "ring-2 ring-primary/40 ring-offset-2 ring-offset-background animate-highlight-pulse"
        )}
      >
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base font-bold text-primary">{item.userName}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{item.userEmail}</p>
            </div>
            <Badge
              variant="secondary"
              className="font-mono text-xs px-2.5 py-0.5 bg-primary/10 text-primary"
            >
              {item.totalHours} hrs
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="size-4 text-muted-foreground" />
              <span>{periodHeading(item)}</span>
            </div>

            {item.submittedAt ? (
              <p className="text-[11px] text-muted-foreground">
                Submitted:{" "}
                <span className="text-foreground font-medium">
                  {new Date(item.submittedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: timezone ?? "UTC"
                  })}
                </span>
              </p>
            ) : null}

            {batchLabel ? (
              <Badge variant="outline" className="text-[10px] w-fit">
                {batchLabel}
              </Badge>
            ) : null}

            {blockedByAmendment ? (
              <p className="text-xs text-status-warning-fg bg-status-warning-bg border border-status-warning-border rounded-md px-2 py-1.5">
                Resolve the open edit request before approving or rejecting this period.
              </p>
            ) : null}

            {item.note && (
              <div className="rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed flex gap-2">
                <MessageSquare className="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-semibold text-muted-foreground block mb-0.5">
                    Submission Note
                  </span>
                  <span className="text-foreground">{item.note}</span>
                </div>
              </div>
            )}

            <PendingActivity item={item} workspaceId={workspaceId} timezone={timezone} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-1/2 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmAction("reject")}
              disabled={actioning || blockedByAmendment}
              title={blockedByAmendment ? "Resolve amendment request first" : undefined}
            >
              <X className="size-3.5 mr-1" />
              <span>Reject</span>
            </Button>
            <Button
              size="sm"
              className="w-1/2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setConfirmAction("approve")}
              disabled={actioning || blockedByAmendment}
              title={blockedByAmendment ? "Resolve amendment request first" : undefined}
            >
              <Check className="size-3.5 mr-1" />
              <span>Approve</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmNoteDialog
        open={confirmAction === "approve"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        title="Approve this timesheet?"
        description={`Approve ${item.userName}'s submission for ${item.projectName} (${periodRangeStr})? Entries in this period will remain locked.`}
        noteLabel="Review comment"
        notePlaceholder="Optional feedback for the member"
        confirmLabel="Approve timesheet"
        submitting={actioning}
        onConfirm={(note) => {
          onReview("approve", note);
          closeDialog();
        }}
      />

      <ConfirmNoteDialog
        open={confirmAction === "reject"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        title="Reject this timesheet?"
        description={`Send ${item.userName}'s submission for ${item.projectName} (${periodRangeStr}) back for correction. The member will see your note.`}
        noteLabel="Rejection reason"
        notePlaceholder="Explain what needs to be corrected"
        noteRequired
        destructive
        confirmLabel="Reject timesheet"
        submitting={actioning}
        onConfirm={(note) => {
          onReview("reject", note);
          closeDialog();
        }}
      />
    </>
  );
}
