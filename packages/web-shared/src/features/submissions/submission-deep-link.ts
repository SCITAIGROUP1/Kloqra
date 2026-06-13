import type { TimesheetApprovalsFilterQuery } from "@kloqra/contracts";

export type MemberSubmissionsDeepLink = {
  projectId?: string;
  periodStart?: string;
  highlight?: "remind" | "rejected" | "amendment-approved";
};

export type AdminApprovalsDeepLink = {
  tab?: "review" | "missing" | "amendments";
  periodId?: string;
  amendmentId?: string;
  batch?: string;
  projectId?: string;
  userId?: string;
  from?: string;
  to?: string;
};

export function buildMemberSubmissionsHref(params: MemberSubmissionsDeepLink): string {
  const search = new URLSearchParams();
  if (params.projectId) search.set("projectId", params.projectId);
  if (params.periodStart) search.set("periodStart", params.periodStart);
  if (params.highlight) search.set("highlight", params.highlight);
  const q = search.toString();
  return q ? `/submissions?${q}` : "/submissions";
}

export function buildAdminApprovalsHref(params: AdminApprovalsDeepLink): string {
  const search = new URLSearchParams();
  if (params.tab) search.set("tab", params.tab);
  if (params.periodId) search.set("periodId", params.periodId);
  if (params.amendmentId) search.set("amendmentId", params.amendmentId);
  if (params.batch) search.set("batch", params.batch);
  if (params.projectId) search.set("projectId", params.projectId);
  if (params.userId) search.set("userId", params.userId);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  const q = search.toString();
  return q ? `/approvals?${q}` : "/approvals";
}

export function parseMemberSubmissionsSearch(search: string): MemberSubmissionsDeepLink {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const highlight = params.get("highlight");
  return {
    projectId: params.get("projectId") ?? undefined,
    periodStart: params.get("periodStart") ?? undefined,
    highlight:
      highlight === "remind" || highlight === "rejected" || highlight === "amendment-approved"
        ? highlight
        : undefined
  };
}

export function parseAdminApprovalsSearch(search: string): AdminApprovalsDeepLink {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const tab = params.get("tab");
  return {
    tab: tab === "review" || tab === "missing" || tab === "amendments" ? tab : undefined,
    periodId: params.get("periodId") ?? undefined,
    amendmentId: params.get("amendmentId") ?? undefined,
    batch: params.get("batch") ?? undefined,
    projectId: params.get("projectId") ?? undefined,
    userId: params.get("userId") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined
  };
}

export function parseApprovalsFilterSearch(search: string): TimesheetApprovalsFilterQuery {
  const params = parseAdminApprovalsSearch(search);
  return {
    projectId: params.projectId,
    userId: params.userId,
    from: params.from,
    to: params.to
  };
}

export function appendApprovalsFilterSearch(
  params: URLSearchParams,
  filter: TimesheetApprovalsFilterQuery
): void {
  for (const key of ["projectId", "userId", "from", "to"] as const) {
    const value = filter[key];
    if (value) params.set(key, value);
    else params.delete(key);
  }
}

export function buildApprovalsFilterQueryString(filter: TimesheetApprovalsFilterQuery): string {
  const params = new URLSearchParams();
  appendApprovalsFilterSearch(params, filter);
  return params.toString();
}

export function hasActiveApprovalsFilter(filter: TimesheetApprovalsFilterQuery): boolean {
  return Boolean(filter.projectId || filter.userId || filter.from || filter.to);
}
