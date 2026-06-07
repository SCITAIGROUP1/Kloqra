"use client";

import { ROUTES } from "@chronomint/contracts";
import type {
  PendingTimesheetDto,
  PresenceSnapshotDto,
  ListTimeLogsResponseDto,
  ListTimelogAuditEventsResponseDto,
  TaskDto,
  ProjectDto
} from "@chronomint/contracts";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  SegmentedControl,
  Input,
  Button,
  TimeEntryAuditTrail
} from "@chronomint/ui";
import { Check, X, Clock, Calendar, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { usePresenceStore } from "@/stores/presence.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

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
      api<TaskDto[]>(ROUTES.TASKS.LIST, { workspaceId }),
      api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId }),
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

export function TeamPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { snapshot, setSnapshot } = usePresenceStore();

  const [activeTab, setActiveTab] = useState<"live" | "approvals">("live");
  const [pending, setPending] = useState<PendingTimesheetDto[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    if (!ws) return;
    const loadLive = () =>
      api<PresenceSnapshotDto>(ROUTES.PRESENCE.SNAPSHOT, { workspaceId: ws }).then(setSnapshot);
    void loadLive();
    const interval = setInterval(loadLive, 5000);
    return () => clearInterval(interval);
  }, [ws, setSnapshot]);

  const fetchPending = useCallback(async () => {
    if (!ws) return;
    setLoadingPending(true);
    try {
      const data = await api<PendingTimesheetDto[]>(ROUTES.TIMESHEETS.LIST_PENDING, {
        workspaceId: ws
      });
      setPending(data);
    } catch {
      toast.error("Failed to load pending timesheets");
    } finally {
      setLoadingPending(false);
    }
  }, [ws]);

  useEffect(() => {
    if (activeTab === "approvals") {
      void fetchPending();
    }
  }, [activeTab, fetchPending]);

  const handleReview = async (id: string, action: "approve" | "reject") => {
    setActioningId(id);
    const reviewNote = reviewNotes[id] || "";
    try {
      const endpoint =
        action === "approve" ? ROUTES.TIMESHEETS.APPROVE(id) : ROUTES.TIMESHEETS.REJECT(id);
      await api(endpoint, {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({ reviewNote })
      });
      toast.success(`Timesheet ${action === "approve" ? "approved" : "rejected"} successfully`);
      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await fetchPending();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to review timesheet`);
    } finally {
      setActioningId(null);
    }
  };

  const members = snapshot?.members ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <PageHeader
          title="Team live & Approvals"
          description="Monitor live stopwatch activity and review submitted timesheets by project."
          className="border-none pb-0"
        />
        <div className="shrink-0">
          <SegmentedControl
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "live", label: "Stopwatch Activity" },
              { value: "approvals", label: "Timesheet Approvals" }
            ]}
          />
        </div>
      </div>

      {activeTab === "live" ? (
        <Card className="border-primary/10 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              <span>Currently clocked in</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Clock className="size-8 mb-2 opacity-40 animate-pulse text-primary" />
                <p className="text-sm font-medium">No active timers</p>
                <p className="text-xs max-w-sm mt-1">
                  Team members currently logging time using the stopwatch will show up here in
                  real-time.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {members.map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {m.userName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{m.userName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span className="inline-block size-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>
                            Logged on: {m.projectName} / {m.taskName}
                          </span>
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {loadingPending ? (
            <div className="flex items-center justify-center py-20">
              <Clock className="size-8 animate-spin text-primary opacity-60" />
            </div>
          ) : pending.length === 0 ? (
            <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center">
              <Check className="size-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full mb-3" />
              <p className="font-medium text-sm">All timesheets reviewed</p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                You have no pending timesheet approvals left for this workspace. Excellent!
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pending.map((t) => (
                <Card
                  key={t.id}
                  className="border-primary/10 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <CardHeader className="pb-3 border-b border-border/40">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-bold text-primary">
                          {t.userName}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.userEmail}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs px-2.5 py-0.5 bg-primary/10 text-primary"
                      >
                        {t.totalHours} hrs
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="size-4 text-muted-foreground" />
                        <span>{periodHeading(t)}</span>
                      </div>

                      {t.note && (
                        <div className="rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed flex gap-2">
                          <MessageSquare className="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="font-semibold text-muted-foreground block mb-0.5">
                              Submission Note
                            </span>
                            <span className="text-foreground">{t.note}</span>
                          </div>
                        </div>
                      )}

                      {ws && <PendingActivity item={t} workspaceId={ws} />}
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <label
                          htmlFor={`review-${t.id}`}
                          className="text-xs text-muted-foreground font-medium"
                        >
                          Review comment (optional)
                        </label>
                        <Input
                          id={`review-${t.id}`}
                          placeholder="Provide feedback on approval or rejection"
                          value={reviewNotes[t.id] || ""}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({ ...prev, [t.id]: e.target.value }))
                          }
                          className="text-xs h-8"
                          disabled={actioningId === t.id}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-1/2 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleReview(t.id, "reject")}
                          disabled={actioningId === t.id}
                        >
                          <X className="size-3.5 mr-1" />
                          <span>Reject</span>
                        </Button>
                        <Button
                          size="sm"
                          className="w-1/2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleReview(t.id, "approve")}
                          disabled={actioningId === t.id}
                        >
                          <Check className="size-3.5 mr-1" />
                          <span>Approve</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
