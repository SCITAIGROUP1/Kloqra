import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimeTrackerEntryStatus } from "./time-tracker-entry-status";

describe("TimeTrackerEntryStatus", () => {
  it("renders pending and billable badges", () => {
    const html = renderToStaticMarkup(
      <TimeTrackerEntryStatus approval={{ showApproval: true, status: "SUBMITTED" }} isBillable />
    );

    expect(html).toContain("pending");
    expect(html).toContain("Billable");
  });
});
