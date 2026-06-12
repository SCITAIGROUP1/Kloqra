import { describe, expect, it } from "vitest";
import {
  renderNotificationEmailHtml,
  renderNotificationEmailText
} from "./notification-email.layout";

describe("notification-email.layout", () => {
  it("renders branded html with CTA and details", () => {
    const html = renderNotificationEmailHtml({
      title: "Timesheet approved",
      body: "Your timesheet for Week 23 was approved.",
      preheader: "Approved timesheet",
      ctaHref: "https://app.example.com/timesheet",
      ctaLabel: "View timesheet",
      variant: "success",
      details: [{ label: "Project", value: "Website Redesign" }]
    });
    expect(html).toContain("Timesheet approved");
    expect(html).toContain("View timesheet");
    expect(html).toContain("Website Redesign");
    expect(html).toContain("Approved");
  });

  it("renders plain text fallback", () => {
    const text = renderNotificationEmailText({
      title: "Export failed",
      body: "Schedule could not run.",
      preheader: "Export issue",
      ctaHref: "https://admin.example.com/exports",
      ctaLabel: "View exports",
      variant: "warning"
    });
    expect(text).toContain("Export failed");
    expect(text).toContain("View exports: https://admin.example.com/exports");
  });
});
