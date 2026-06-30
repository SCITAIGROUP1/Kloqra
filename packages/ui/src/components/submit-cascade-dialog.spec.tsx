import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubmitCascadeDialog } from "./submit-cascade-dialog.js";

describe("SubmitCascadeDialog", () => {
  it("renders blocked reason when cascade is blocked", () => {
    render(
      <SubmitCascadeDialog
        open
        onOpenChange={() => {}}
        preview={{
          targetPeriod: {
            id: "p1",
            userId: "u1",
            workspaceId: "w1",
            projectId: "proj1",
            projectName: "Project",
            periodStart: "2025-06-02T00:00:00.000Z",
            periodEnd: "2025-06-08T23:59:59.999Z",
            approvalPeriod: "weekly",
            status: "DRAFT",
            note: null,
            reviewNote: null,
            reviewedBy: null,
            submittedAt: null,
            reviewedAt: null
          },
          cascadedPeriods: [],
          blockedReason: "Resolve the rejected period first."
        }}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText("Resolve the rejected period first.")).toBeInTheDocument();
  });

  it("renders single-period submit preview", () => {
    render(
      <SubmitCascadeDialog
        open
        onOpenChange={() => {}}
        preview={{
          targetPeriod: {
            id: "p1",
            userId: "u1",
            workspaceId: "w1",
            projectId: "proj1",
            projectName: "Website",
            periodStart: "2025-06-02T00:00:00.000Z",
            periodEnd: "2025-06-08T23:59:59.999Z",
            approvalPeriod: "weekly",
            status: "DRAFT",
            note: null,
            reviewNote: null,
            reviewedBy: null,
            submittedAt: null,
            reviewedAt: null
          },
          cascadedPeriods: []
        }}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeEnabled();
  });
});
