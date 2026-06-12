import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";

test.describe("Timesheet calendar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/timesheet");
    await dismissOnboardingIfVisible(page);
    await expect(page).toHaveURL(/\/timesheet/);
    await expect(page.getByRole("button", { name: "week", exact: true })).toBeVisible();
  });

  test("shows mobile Time Tracker tip on a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(() => {
      sessionStorage.removeItem("kloqra-timesheet-mobile-banner-dismissed");
    });
    await page.goto("/timesheet");
    await expect(page.getByText(/easier for viewing and editing entries/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Open" })).toBeVisible();
  });

  test("week view scrolls horizontally instead of overflowing the page", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole("button", { name: "week", exact: true }).click();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });
});
