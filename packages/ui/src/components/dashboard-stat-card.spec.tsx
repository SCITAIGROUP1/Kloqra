import { Clock } from "lucide-react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardStatCard } from "./dashboard-stat-card.js";

describe("DashboardStatCard", () => {
  it("renders label, value, hint, and trend", () => {
    const html = renderToStaticMarkup(
      <DashboardStatCard
        label="Total Hours"
        value="400:30"
        hint="14 members active"
        icon={Clock}
        tone="primary"
        trend={{ label: "+12.5%", positive: true }}
      />
    );

    expect(html).toContain("Total Hours");
    expect(html).toContain("400:30");
    expect(html).toContain("14 members active");
    expect(html).toContain("+12.5%");
  });
});
