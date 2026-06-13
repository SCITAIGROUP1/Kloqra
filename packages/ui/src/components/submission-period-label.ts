import type { TimesheetApprovalPeriod } from "@kloqra/contracts";

export function formatSubmissionPeriodLabel(
  periodStartIso: string,
  approvalPeriod: TimesheetApprovalPeriod
): string {
  const start = new Date(periodStartIso);
  if (approvalPeriod === "daily") {
    return start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  }
  if (approvalPeriod === "monthly") {
    return start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  return `Week of ${start.toISOString().slice(0, 10)}`;
}
