/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotificationDetails, notificationVariantClass } from "./notification-ui";

describe("notification-ui", () => {
  it("maps variant metadata to utility classes", () => {
    expect(notificationVariantClass({ variant: "success" })).toContain("emerald");
    expect(notificationVariantClass({ variant: "warning" })).toContain("destructive");
  });

  it("renders detail rows", () => {
    render(
      <NotificationDetails
        details={[
          { label: "Project", value: "Website Redesign" },
          { label: "Period", value: "Week 23" }
        ]}
      />
    );
    expect(screen.getByText(/Project:/)).toBeTruthy();
    expect(screen.getByText(/Week 23/)).toBeTruthy();
  });
});
