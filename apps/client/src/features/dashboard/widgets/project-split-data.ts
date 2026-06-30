import type { ProjectDto, TaskDto, TimeLogDto } from "@kloqra/contracts";
import { colorForProject } from "@/lib/project-color-styles";

export type ProjectDistributionRow = {
  id: string;
  projectName: string;
  clientName: string | null;
  hours: number;
  percentage: number;
  color: string;
};

export type ProjectDistributionChartRow = ProjectDistributionRow & {
  value: number;
  fill: string;
  configKey: string;
};

export type ProjectDistributionData = {
  rows: ProjectDistributionRow[];
  chartRows: ProjectDistributionChartRow[];
  totalHours: number;
};

function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100;
}

export function buildProjectDistributionData(
  logs: TimeLogDto[],
  projects: ProjectDto[],
  tasks: TaskDto[]
): ProjectDistributionData {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const projectHoursMap: Record<string, number> = {};

  for (const log of logs) {
    const task = taskById.get(log.taskId);
    const projectId = task?.projectId ?? "unknown";
    const hours = log.durationSec / 3600;
    projectHoursMap[projectId] = (projectHoursMap[projectId] ?? 0) + hours;
  }

  const rawTotal = Object.values(projectHoursMap).reduce((sum, hours) => sum + hours, 0);
  const totalHours = roundHours(rawTotal);

  const rows: ProjectDistributionRow[] = Object.entries(projectHoursMap)
    .map(([projectId, hours]) => {
      const project = projectById.get(projectId);
      const projectName =
        project?.name ?? (projectId === "unknown" ? "No Project" : "Other Project");
      const roundedHours = roundHours(hours);
      const percentage = rawTotal > 0 ? Math.round((hours / rawTotal) * 1000) / 10 : 0;

      return {
        id: projectId,
        projectName,
        clientName: project?.clientName ?? null,
        hours: roundedHours,
        percentage,
        color: colorForProject(projectId, projects)
      };
    })
    .sort((a, b) => b.hours - a.hours);

  const chartRows: ProjectDistributionChartRow[] = rows.map((row, idx) => ({
    ...row,
    value: row.hours,
    fill: row.color,
    configKey: `project_${idx}`
  }));

  return { rows, chartRows, totalHours };
}
