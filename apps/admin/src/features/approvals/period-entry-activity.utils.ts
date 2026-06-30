import type { TimeLogDto, TaskDto } from "@kloqra/contracts";
import type { TimeEntryAuditEvent } from "@kloqra/ui";

export function filterLogsForProject(
  logs: TimeLogDto[],
  projectId: string,
  tasks: TaskDto[]
): TimeLogDto[] {
  const projectTaskIds = new Set(
    tasks.filter((task) => task.projectId === projectId).map((task) => task.id)
  );
  return logs.filter((log) => projectTaskIds.has(log.taskId));
}

export function mergeAuditEvents(items: TimeEntryAuditEvent[][]): TimeEntryAuditEvent[] {
  return items
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function formatEntryDuration(durationSec: number): string {
  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export function formatEntryTimeRange(
  startTime: string,
  endTime: string,
  timezone?: string
): string {
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

export function sortLogsByStartDesc(logs: TimeLogDto[]): TimeLogDto[] {
  return [...logs].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}
