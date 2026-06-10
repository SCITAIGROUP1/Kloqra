import type { ProjectDto, TimeLogDto, TimesheetPeriodDto } from "@kloqra/contracts";
import { formatHoursCompact } from "./group-logs-by-week";
import { periodStatLabel, type TimeTrackerPeriodPreset } from "./time-tracker-period";

export type TimeTrackerStats = {
  periodLabel: string;
  totalHours: string;
  billableHours: string;
  billablePercent: string;
  pendingHours: string;
  pendingCount: number;
  entryCount: number;
};

function submissionForLog(
  log: TimeLogDto,
  projectId: string | undefined,
  submissionByKey: Map<string, TimesheetPeriodDto>
): TimesheetPeriodDto | undefined {
  if (!projectId) return undefined;
  const start = new Date(log.startTime);
  for (const sub of submissionByKey.values()) {
    if (sub.projectId !== projectId) continue;
    const pStart = new Date(sub.periodStart);
    const pEnd = new Date(sub.periodEnd);
    if (start >= pStart && start <= pEnd) return sub;
  }
  return undefined;
}

export function computeTimeTrackerStats(
  logs: TimeLogDto[],
  preset: TimeTrackerPeriodPreset,
  projects: ProjectDto[],
  tasks: { id: string; projectId: string }[],
  submissionByKey: Map<string, TimesheetPeriodDto>
): TimeTrackerStats {
  let totalSec = 0;
  let billableSec = 0;
  let pendingSec = 0;
  let pendingCount = 0;

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const taskProjectById = new Map(tasks.map((t) => [t.id, t.projectId]));

  for (const log of logs) {
    totalSec += log.durationSec;
    if (log.isBillable) billableSec += log.durationSec;

    const projectId = taskProjectById.get(log.taskId);
    const project = projectId ? projectById.get(projectId) : undefined;
    if (!project?.timesheetApprovalEnabled) continue;

    const sub = submissionForLog(log, projectId, submissionByKey);
    if (sub?.status === "SUBMITTED") {
      pendingSec += log.durationSec;
      pendingCount += 1;
    }
  }

  const billablePercent =
    totalSec > 0 ? `${Math.round((billableSec / totalSec) * 100)}% of total` : "0% of total";

  return {
    periodLabel: periodStatLabel(preset),
    totalHours: formatHoursCompact(totalSec),
    billableHours: formatHoursCompact(billableSec),
    billablePercent,
    pendingHours: formatHoursCompact(pendingSec),
    pendingCount,
    entryCount: logs.length
  };
}
