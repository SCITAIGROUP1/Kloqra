import type { TimesheetApprovalsFilterQuery } from "@kloqra/contracts";

export function buildPeriodStartRange(
  filter: TimesheetApprovalsFilterQuery
): { gte?: Date; lte?: Date } | undefined {
  if (!filter.from && !filter.to) return undefined;
  const range: { gte?: Date; lte?: Date } = {};
  if (filter.from) range.gte = new Date(filter.from);
  if (filter.to) {
    const end = new Date(filter.to);
    end.setUTCHours(23, 59, 59, 999);
    range.lte = end;
  }
  return range;
}

export function matchesPeriodStartFilter(
  periodStartIso: string,
  filter: TimesheetApprovalsFilterQuery
): boolean {
  if (!filter.from && !filter.to) return true;
  const start = new Date(periodStartIso).getTime();
  if (filter.from && start < new Date(filter.from).getTime()) return false;
  if (filter.to) {
    const end = new Date(filter.to);
    end.setUTCHours(23, 59, 59, 999);
    if (start > end.getTime()) return false;
  }
  return true;
}

export function appendApprovalsFilterParams(
  params: URLSearchParams,
  filter: TimesheetApprovalsFilterQuery
): void {
  if (filter.projectId) {
    if (Array.isArray(filter.projectId)) {
      params.set("projectId", filter.projectId.join(","));
    } else {
      params.set("projectId", filter.projectId);
    }
  }
  if (filter.userId) {
    if (Array.isArray(filter.userId)) {
      params.set("userId", filter.userId.join(","));
    } else {
      params.set("userId", filter.userId);
    }
  }
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
}
