import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SubmissionStatusCard } from "@/features/timesheet/submission-status-card";

describe("SubmissionStatusCard", () => {
  it("renders Submit for review button for draft periods", () => {
    const html = renderToStaticMarkup(
      <SubmissionStatusCard
        statusInfo={{
          id: "period-1",
          userId: "user-1",
          workspaceId: "ws-1",
          projectId: "proj-1",
          projectName: "Support Retainer",
          periodStart: "2025-06-02T00:00:00.000Z",
          periodEnd: "2025-06-08T23:59:59.999Z",
          approvalPeriod: "weekly",
          status: "DRAFT",
          note: null,
          reviewNote: null,
          reviewedBy: null,
          submittedAt: null,
          reviewedAt: null
        }}
        onSubmitted={() => {}}
        anchorDate={new Date("2025-06-05T12:00:00.000Z")}
      />
    );

    expect(html).toContain("Submit for review");
  });
});
