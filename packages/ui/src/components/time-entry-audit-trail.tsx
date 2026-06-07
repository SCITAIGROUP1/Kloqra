"use client";

import { useEffect, useState } from "react";
import { cn } from "../lib/utils.js";

export type TimeEntryAuditEvent = {
  id: string;
  actorName: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  before: {
    startTime: string;
    endTime: string;
    isBillable: boolean;
    description: string | null;
    taskId?: string | null;
  } | null;
  after: {
    startTime: string;
    endTime: string;
    isBillable: boolean;
    description: string | null;
    taskId?: string | null;
  } | null;
  createdAt: string;
};

function formatTimeRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleString()} – ${e.toLocaleTimeString()}`;
}

function describeEvent(
  event: TimeEntryAuditEvent,
  tasks?: { id: string; taskName: string; projectId: string }[],
  projects?: { id: string; name: string }[]
): string {
  const snap = event.after ?? event.before;
  if (!snap) return event.action.toLowerCase();

  if (event.action === "CREATE") {
    return `Created entry · ${formatTimeRange(snap.startTime, snap.endTime)} · ${snap.isBillable ? "billable" : "non-billable"}`;
  }
  if (event.action === "DELETE") {
    return `Deleted entry · ${formatTimeRange(snap.startTime, snap.endTime)}`;
  }

  if (event.before && event.after) {
    const beforeStart = new Date(event.before.startTime);
    const afterStart = new Date(event.after.startTime);
    const beforeEnd = new Date(event.before.endTime);
    const afterEnd = new Date(event.after.endTime);

    // Compare with minute-level precision to avoid false-positives from client-side date formatting
    const timeChanged =
      Math.floor(beforeStart.getTime() / 60000) !== Math.floor(afterStart.getTime() / 60000) ||
      Math.floor(beforeEnd.getTime() / 60000) !== Math.floor(afterEnd.getTime() / 60000);

    const billableChanged = event.before.isBillable !== event.after.isBillable;
    const descChanged = event.before.description !== event.after.description;
    const taskChanged = event.before.taskId !== event.after.taskId;

    const changes: string[] = [];
    if (taskChanged) {
      const beforeTask = tasks?.find((t) => t.id === event.before?.taskId);
      const afterTask = tasks?.find((t) => t.id === event.after?.taskId);
      if (beforeTask && afterTask) {
        if (beforeTask.projectId !== afterTask.projectId) {
          const beforeProj = projects?.find((p) => p.id === beforeTask.projectId);
          const afterProj = projects?.find((p) => p.id === afterTask.projectId);
          changes.push(
            `moved project: ${beforeProj?.name ?? "Unknown"} → ${afterProj?.name ?? "Unknown"}`
          );
        } else {
          changes.push(`changed task: ${beforeTask.taskName} → ${afterTask.taskName}`);
        }
      } else {
        changes.push("changed task");
      }
    }
    if (timeChanged) {
      changes.push(`rescheduled to ${formatTimeRange(event.after.startTime, event.after.endTime)}`);
    }
    if (billableChanged) {
      changes.push(
        `changed billable: ${event.before.isBillable ? "yes" : "no"} → ${event.after.isBillable ? "yes" : "no"}`
      );
    }
    if (descChanged) {
      changes.push(`updated description`);
    }

    if (changes.length > 0) {
      const text = changes.join(", ");
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
  }

  return `Updated entry · ${formatTimeRange(snap.startTime, snap.endTime)}`;
}

export function TimeEntryAuditTrail({
  fetchEvents,
  tasks,
  projects,
  className
}: {
  fetchEvents: () => Promise<TimeEntryAuditEvent[]>;
  tasks?: { id: string; taskName: string; projectId: string }[];
  projects?: { id: string; name: string }[];
  className?: string;
}) {
  const [events, setEvents] = useState<TimeEntryAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchEvents()
      .then((items) => {
        if (!cancelled) setEvents(items);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchEvents]);

  if (loading) {
    return <p className={cn("text-xs text-muted-foreground", className)}>Loading history…</p>;
  }
  if (error) {
    return <p className={cn("text-xs text-destructive", className)}>{error}</p>;
  }
  if (events.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>No changes recorded yet.</p>
    );
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {events.map((event) => (
        <li
          key={event.id}
          className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-relaxed"
        >
          <p className="font-medium">{event.actorName}</p>
          <p className="text-muted-foreground">{describeEvent(event, tasks, projects)}</p>
          <p className="text-[10px] text-muted-foreground/80 mt-1">
            {new Date(event.createdAt).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
