import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PendingTimesheetCard } from "./pending-timesheet-card";

vi.mock("@/lib/api", () => ({
  api: vi.fn()
}));

describe("PendingTimesheetCard", () => {
  it("renders member and project details", () => {
    const html = renderToStaticMarkup(
      <PendingTimesheetCard
        item={{
          id: "period-1",
          userId: "user-1",
          userName: "Sam Rivera",
          userEmail: "member@kloqra.dev",
          projectId: "proj-1",
          projectName: "Support Retainer",
          periodStart: "2025-06-02T00:00:00.000Z",
          periodEnd: "2025-06-08T23:59:59.999Z",
          approvalPeriod: "weekly",
          status: "SUBMITTED",
          note: "Week complete",
          submittedAt: "2025-06-09T10:00:00.000Z",
          totalHours: 32.5
        }}
        workspaceId="ws-1"
        reviewNote=""
        onReviewNoteChange={() => {}}
        onReview={() => {}}
        actioning={false}
      />
    );

    expect(html).toContain("Sam Rivera");
    expect(html).toContain("Support Retainer");
    expect(html).toContain("Approve");
    expect(html).toContain("Reject");
  });
});
