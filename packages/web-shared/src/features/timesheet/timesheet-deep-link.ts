import type { TimesheetPeriodDto } from "@kloqra/contracts";

export type MemberTimesheetView = "day" | "week" | "month";

export type MemberTimesheetDeepLink = {
  projectId?: string;
  date?: string;
  view?: MemberTimesheetView;
};

export function viewForApprovalPeriod(
  approvalPeriod: TimesheetPeriodDto["approvalPeriod"]
): MemberTimesheetView {
  if (approvalPeriod === "daily") return "day";
  if (approvalPeriod === "monthly") return "month";
  return "week";
}

export function buildMemberTimesheetHref(params: MemberTimesheetDeepLink): string {
  const search = new URLSearchParams();
  if (params.projectId) search.set("projectId", params.projectId);
  if (params.date) search.set("date", params.date);
  if (params.view && params.view !== "week") search.set("view", params.view);
  const q = search.toString();
  return q ? `/timesheet?${q}` : "/timesheet";
}

export function buildMemberTimesheetHrefFromSubmission(
  submission: Pick<TimesheetPeriodDto, "projectId" | "periodStart" | "approvalPeriod">
): string {
  return buildMemberTimesheetHref({
    projectId: submission.projectId,
    date: submission.periodStart,
    view: viewForApprovalPeriod(submission.approvalPeriod)
  });
}

export function parseMemberTimesheetSearch(search: string): MemberTimesheetDeepLink {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const view = params.get("view");
  return {
    projectId: params.get("projectId") ?? undefined,
    date: params.get("date") ?? undefined,
    view: view === "day" || view === "week" || view === "month" ? view : undefined
  };
}
