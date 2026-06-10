import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WidgetShell } from "./widget-shell.js";

describe("WidgetShell", () => {
  it("renders children in view mode", () => {
    const html = renderToStaticMarkup(
      <WidgetShell id="weekly_chart" label="Weekly Activity" isEditing={false}>
        <div>Chart body</div>
      </WidgetShell>
    );
    expect(html).toContain("Weekly Activity");
    expect(html).toContain("Chart body");
  });
});
