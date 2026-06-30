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
    expect(html).toContain("status-warning-bg");
    expect(html).toContain("status-warning-fg");
  });

  it("renders edit pending overlay", () => {
    const html = renderToStaticMarkup(
      <TimesheetApprovalStatusBadge status="SUBMITTED" amendmentPending />
    );
    expect(html).toContain("Edit pending");
    expect(html).toContain("status-info-bg");
    expect(html).toContain("status-info-fg");
  });

  it("renders approved status", () => {
    const html = renderToStaticMarkup(<TimesheetApprovalStatusBadge status="APPROVED" />);
    expect(html).toContain("Approved");
    expect(html).toContain("status-success-bg");
    expect(html).toContain("status-success-fg");
  });

  it("renders waived status", () => {
    const html = renderToStaticMarkup(<TimesheetApprovalStatusBadge status="WAIVED" />);
    expect(html).toContain("Waived");
  });
});
