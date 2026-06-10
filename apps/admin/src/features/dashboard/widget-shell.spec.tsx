import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WidgetShell } from "./widget-shell";

describe("WidgetShell", () => {
  it("renders without widget chrome in view mode for KPI widgets", () => {
    const html = renderToStaticMarkup(
      <WidgetShell
        id="stat_total_hours"
        label="Total Hours"
        isEditing={false}
        showTitleInView={false}
      >
        <div>Total Hours</div>
      </WidgetShell>
    );

    expect(html.match(/Total Hours/g)?.length).toBe(1);
    expect(html).not.toContain("Widget actions");
    expect(html).not.toContain("Hide widget");
    expect(html).not.toContain("card-header");
  });

  it("shows chart title in view mode", () => {
    const html = renderToStaticMarkup(
      <WidgetShell id="weekly_chart" label="Weekly Activity" isEditing={false}>
        <div>Chart body</div>
      </WidgetShell>
    );

    expect(html).toContain("Weekly Activity");
    expect(html).not.toContain("Hide widget");
  });

  it("omits title row while arranging", () => {
    const html = renderToStaticMarkup(
      <WidgetShell id="weekly_chart" label="Weekly Activity" isEditing>
        <div>Chart body</div>
      </WidgetShell>
    );

    expect(html).not.toContain("Weekly Activity");
    expect(html).not.toContain("Hide widget");
    expect(html).toContain("cursor-grab");
  });
});
