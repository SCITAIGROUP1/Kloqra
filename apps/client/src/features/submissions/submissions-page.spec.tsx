import { describe, expect, it } from "vitest";
import { filterSubmissionsByPeriodRange, filterSubmissionsByTab } from "./use-my-submissions";

const baseSubmission = {
  id: "period-1",
  userId: "user-1",
  workspaceId: "ws-1",
  projectId: "proj-1",
  projectName: "Support Retainer",
  periodStart: "2025-06-02T00:00:00.000Z",
  periodEnd: "2025-06-08T23:59:59.999Z",
  approvalPeriod: "weekly" as const,
  note: null,
  reviewNote: null,
  reviewedBy: null,
  submittedAt: null,
  reviewedAt: null
};

describe("filterSubmissionsByTab", () => {
  it("filters by status tab", () => {
    const items = [
      { ...baseSubmission, status: "DRAFT" as const },
      { ...baseSubmission, id: "period-2", status: "SUBMITTED" as const },
      { ...baseSubmission, id: "period-3", status: "APPROVED" as const },
      { ...baseSubmission, id: "period-4", status: "REJECTED" as const }
    ];
    expect(filterSubmissionsByTab(items, "action")).toHaveLength(2);
    expect(filterSubmissionsByTab(items, "pending")).toHaveLength(1);
    expect(filterSubmissionsByTab(items, "approved")).toHaveLength(1);
    expect(filterSubmissionsByTab(items, "all")).toHaveLength(4);
  });

  it("filters by period start date range", () => {
    const items = [
      { ...baseSubmission, status: "DRAFT" as const, periodStart: "2025-06-02T00:00:00.000Z" },
      {
        ...baseSubmission,
        id: "period-2",
        status: "DRAFT" as const,
        periodStart: "2025-07-01T00:00:00.000Z"
      }
    ];
    expect(filterSubmissionsByPeriodRange(items, "2025-06-01", "2025-06-30")).toHaveLength(1);
    expect(filterSubmissionsByPeriodRange(items, "", "")).toHaveLength(2);
  });
});
