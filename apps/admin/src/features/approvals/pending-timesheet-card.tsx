"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  PendingTimesheetDto,
  ListTimeLogsResponseDto,
  ListTimelogAuditEventsResponseDto,
  TaskDto,
  ProjectDto
} from "@kloqra/contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  TimeEntryAuditTrail
} from "@kloqra/ui";
import { fetchListItems } from "@kloqra/web-shared";
import { Calendar, Check, MessageSquare, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function formatDateRange(startStr: string, endStr: string) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function periodHeading(t: PendingTimesheetDto) {
  const label =
    t.approvalPeriod === "daily" ? "Day" : t.approvalPeriod === "monthly" ? "Month" : "Week";
  return `${t.projectName} · ${label}: ${formatDateRange(t.periodStart, t.periodEnd)}`;
}

function PendingActivity({
  item,
  workspaceId
}: {
  item: PendingTimesheetDto;
  workspaceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [logIds, setLogIds] = useState<string[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);

  useEffect(() => {
    if (!open || !workspaceId) return;
    const params = new URLSearchParams({
      userId: item.userId,
      from: item.periodStart,
      to: item.periodEnd
    });
    void Promise.all([
      fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId }),
      fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId }),
      api<ListTimeLogsResponseDto>(`${ROUTES.TIMELOGS.LIST}?${params}`, { workspaceId })
    ]).then(([fetchedTasks, fetchedProjects, res]) => {
      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
      const projectTaskIds = new Set(
        fetchedTasks.filter((task) => task.projectId === item.projectId).map((task) => task.id)
      );
      const ids = res.items.filter((log) => projectTaskIds.has(log.taskId)).map((log) => log.id);
      setLogIds(ids);
    });
  }, [open, workspaceId, item]);

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
      {open && (
        <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
          {logIds.length === 0 ? (
            <p className="text-xs text-muted-foreground">No entries in this period.</p>
          ) : (
            logIds.slice(0, 8).map((id) => (
              <div key={id} className="rounded-md border border-border/60 p-2">
                <TimeEntryAuditTrail
                  tasks={tasks}
                  projects={projects}
                  fetchEvents={async () => {
                    const res = await api<ListTimelogAuditEventsResponseDto>(
                      ROUTES.TIMELOGS.AUDIT_EVENTS(id),
                      { workspaceId }
                    );
                    return res.items;
                  }}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export interface PendingTimesheetCardProps {
  item: PendingTimesheetDto;
  workspaceId: string;
  reviewNote: string;
  onReviewNoteChange: (value: string) => void;
  onReview: (action: "approve" | "reject") => void;
  actioning: boolean;
}

export function PendingTimesheetCard({
  item,
  workspaceId,
  reviewNote,
  onReviewNoteChange,
  onReview,
  actioning
}: PendingTimesheetCardProps) {
  return (
    <Card className="border-primary/10 hover:shadow-md transition-all flex flex-col justify-between">
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

          <PendingActivity item={item} workspaceId={workspaceId} />
        </div>

        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <label
              htmlFor={`review-${item.id}`}
              className="text-xs text-muted-foreground font-medium"
            >
              Review comment (optional)
            </label>
            <Input
              id={`review-${item.id}`}
              placeholder="Provide feedback on approval or rejection"
              value={reviewNote}
              onChange={(e) => onReviewNoteChange(e.target.value)}
              className="text-xs h-8"
              disabled={actioning}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-1/2 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onReview("reject")}
              disabled={actioning}
            >
              <X className="size-3.5 mr-1" />
              <span>Reject</span>
            </Button>
            <Button
              size="sm"
              className="w-1/2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onReview("approve")}
              disabled={actioning}
            >
              <Check className="size-3.5 mr-1" />
              <span>Approve</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
