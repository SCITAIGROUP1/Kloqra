import type { TenantAnalyticsWorkspaceRowDto } from "@kloqra/contracts";

export type WorkspaceHoursBillabilityFilter =
  | "ALL"
  | "with-hours"
  | "no-hours"
  | "billable"
  | "non-billable";

export type WorkspaceHoursSort =
  | "hours-desc"
  | "hours-asc"
  | "name-asc"
  | "name-desc"
  | "amount-desc";

export function filterWorkspaceHoursRows(
  rows: TenantAnalyticsWorkspaceRowDto[],
  search: string,
  billability: WorkspaceHoursBillabilityFilter
): TenantAnalyticsWorkspaceRowDto[] {
  const query = search.trim().toLowerCase();

  return rows.filter((row) => {
    if (query && !row.workspaceName.toLowerCase().includes(query)) {
      return false;
    }

    switch (billability) {
      case "with-hours":
        return row.totalHours > 0;
      case "no-hours":
        return row.totalHours === 0;
      case "billable":
        return row.billableHours > 0;
      case "non-billable":
        return row.totalHours > 0 && row.billableHours === 0;
      default:
        return true;
    }
  });
}

export function sortWorkspaceHoursRows(
  rows: TenantAnalyticsWorkspaceRowDto[],
  sort: WorkspaceHoursSort
): TenantAnalyticsWorkspaceRowDto[] {
  const next = [...rows];

  next.sort((a, b) => {
    switch (sort) {
      case "hours-asc":
        return a.totalHours - b.totalHours || a.workspaceName.localeCompare(b.workspaceName);
      case "name-asc":
        return a.workspaceName.localeCompare(b.workspaceName);
      case "name-desc":
        return b.workspaceName.localeCompare(a.workspaceName);
      case "amount-desc":
        return (
          b.billableAmount - a.billableAmount ||
          b.totalHours - a.totalHours ||
          a.workspaceName.localeCompare(b.workspaceName)
        );
      case "hours-desc":
      default:
        return (
          b.totalHours - a.totalHours ||
          b.billableAmount - a.billableAmount ||
          a.workspaceName.localeCompare(b.workspaceName)
        );
    }
  });

  return next;
}
