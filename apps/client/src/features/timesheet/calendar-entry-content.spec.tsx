import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarEntryContent } from "./calendar-entry-content";

describe("CalendarEntryContent", () => {
  it("renders category, duration, task, and description", () => {
    const html = renderToStaticMarkup(
      <CalendarEntryContent
        task={{
          taskName: "UX research",
          categoryName: "UI/UX Design",
          projectName: "Client Portal"
        }}
        description="Wireframes review"
        durationSec={3600}
        compact={false}
      />
    );

    expect(html).toContain("UI/UX Design");
    expect(html).toContain("1h 0m");
    expect(html).toContain("UX research");
    expect(html).toContain("Wireframes review");
  });
});
