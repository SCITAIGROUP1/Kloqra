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

  test("week view does not overflow the page on a 1366×768 laptop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.getByRole("button", { name: "week", exact: true }).click();
    await expect(page.getByRole("button", { name: "Jump to week" })).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });

  test("shows a week date picker beside navigation controls", async ({ page }) => {
    await page.getByRole("button", { name: "week", exact: true }).click();
    await expect(page.getByRole("button", { name: "Jump to week" })).toBeVisible();
    await page.getByRole("button", { name: "Jump to week" }).click();
    await expect(page.getByText("Select any day to open that week.")).toBeVisible();
  });
});
