import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimesheetStatusCard } from "@/features/timesheet/timesheet-status-card";

describe("Approvals send CTA", () => {
  it("renders Send to Approvals button for draft periods", () => {
    const html = renderToStaticMarkup(
      <TimesheetStatusCard
        statusInfo={{
          id: "",
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

    expect(html).toContain("Send to Approvals");
  });
});
