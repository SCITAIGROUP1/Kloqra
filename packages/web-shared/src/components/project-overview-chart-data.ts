import type { ProjectSummaryDto } from "@kloqra/contracts";

export const PROJECT_OVERVIEW_CHART_PALETTE = [
  "hsl(221 83% 53%)",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 67% 58%)",
  "hsl(0 84% 60%)",
  "hsl(187 85% 43%)",
  "hsl(215 16% 55%)",
  "hsl(316 70% 50%)"
] as const;

export type ProjectOverviewTaskBarRow = {
  name: string;
  billableHours: number;
  nonBillableHours: number;
  totalHours: number;
};

export type ProjectOverviewCategoryDonutRow = {
  name: string;
  value: number;
  fill: string;
  configKey: string;
};

export type ProjectOverviewDistributionGroupBy = "member" | "project" | "category";

export type ProjectOverviewDistributionDonutRow = ProjectOverviewCategoryDonutRow & {
  id: string;
};

export function formatOverviewHours(hours: number) {
  return hours.toFixed(2);
}

export function buildProjectOverviewTaskBarData(
  rows: ProjectSummaryDto["byTask"]
): ProjectOverviewTaskBarRow[] {
  return [...rows]
    .sort((a, b) => b.totalHours - a.totalHours)
    .map((row) => ({
      name: row.categoryName ? `${row.taskName} (${row.categoryName})` : row.taskName,
      billableHours: row.billableHours,
      nonBillableHours: Math.max(0, row.totalHours - row.billableHours),
      totalHours: row.totalHours
    }));
}

export function buildProjectOverviewCategoryDonutData(
  rows: ProjectSummaryDto["byCategory"]
): ProjectOverviewCategoryDonutRow[] {
  return rows.map((row, idx) => {
    const configKey = `cat_${idx}`;
    const fill = PROJECT_OVERVIEW_CHART_PALETTE[idx % PROJECT_OVERVIEW_CHART_PALETTE.length]!;
    return {
      name: row.categoryName,
      value: row.totalHours,
      fill,
      configKey
    };
  });
}

export function buildProjectOverviewDistributionDonutData(
  summary: ProjectSummaryDto,
  groupBy: ProjectOverviewDistributionGroupBy
): ProjectOverviewDistributionDonutRow[] {
  const rows =
    groupBy === "member"
      ? summary.byMember.map((row) => ({
          id: row.userId,
          name: row.userName,
          hours: row.totalHours
        }))
      : groupBy === "category"
        ? summary.byCategory.map((row) => ({
            id: row.categoryId,
            name: row.categoryName,
            hours: row.totalHours
          }))
        : [
            {
              id: summary.projectId,
              name: summary.projectName,
              hours: summary.totalHours
            }
          ];

  const top = rows.slice(0, 6);
  const restHours = rows.slice(6).reduce((sum, row) => sum + row.hours, 0);
  const data = top.map((row, idx) => {
    const configKey = `${groupBy}_${idx}`;
    return {
      id: row.id,
      name: row.name,
      value: row.hours,
      fill: PROJECT_OVERVIEW_CHART_PALETTE[idx % PROJECT_OVERVIEW_CHART_PALETTE.length]!,
      configKey
    };
  });

  if (restHours > 0) {
    data.push({
      id: "other",
      name: "Other",
      value: restHours,
      fill: PROJECT_OVERVIEW_CHART_PALETTE[PROJECT_OVERVIEW_CHART_PALETTE.length - 1]!,
      configKey: `${groupBy}_other`
    });
  }

  return data;
}
