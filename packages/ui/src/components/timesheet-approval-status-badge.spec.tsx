import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimesheetApprovalStatusBadge } from "./timesheet-approval-status-badge.js";

describe("TimesheetApprovalStatusBadge", () => {
  it("renders draft status", () => {
    const html = renderToStaticMarkup(<TimesheetApprovalStatusBadge status="DRAFT" />);
    expect(html).toContain("Draft");
  });

  it("renders submitted status as Pending", () => {
    const html = renderToStaticMarkup(<TimesheetApprovalStatusBadge status="SUBMITTED" />);
    expect(html).toContain("Pending");
  });

  it("renders approved status", () => {
    const html = renderToStaticMarkup(<TimesheetApprovalStatusBadge status="APPROVED" />);
    expect(html).toContain("Approved");
  });
});
