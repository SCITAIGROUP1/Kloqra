import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";

test.describe("Client dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await dismissOnboardingIfVisible(page);
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  });

  test("shows period presets and date range picker in one toolbar", async ({ page }) => {
    const periodBar = page.locator(".rounded-xl.border").filter({ hasText: "Period" }).first();
    await expect(periodBar.getByRole("button", { name: "Today" })).toBeVisible();
    await expect(periodBar.getByRole("button", { name: "This week" })).toBeVisible();
    await expect(periodBar.getByRole("button", { name: "This month" })).toBeVisible();
    await expect(periodBar.getByRole("button", { name: "Dashboard date range" })).toBeVisible();
  });

  test("shows collapsible scope filters for project, category, and task", async ({ page }) => {
    await page.getByRole("button", { name: /scope filters/i }).click();
    const panel = page.locator("div.grid.gap-4.rounded-lg.border");
    await expect(panel.getByText("Project", { exact: true })).toBeVisible();
    await expect(panel.getByText("Category", { exact: true })).toBeVisible();
    await expect(panel.getByText("Task", { exact: true })).toBeVisible();
  });

  test("keeps period presets visible after collapsing the sidebar", async ({ page }) => {
    const collapseButton = page.getByRole("button", { name: "Collapse sidebar" });
    if (await collapseButton.isVisible()) {
      await collapseButton.click();
    }

    const periodBar = page.locator(".rounded-xl.border").filter({ hasText: "Period" }).first();
    await expect(periodBar.getByRole("button", { name: "This week" })).toBeVisible();
    await expect(periodBar.getByRole("button", { name: "This month" })).toBeVisible();
  });

  test("renders without horizontal overflow on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });

  test("renders without horizontal overflow on a 1366×768 laptop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });

  test("shows total hours today KPI widget", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Total Hours (Today)" })).toBeVisible();
  });

  test("shows arrange grid control in the app bar", async ({ page }) => {
    await expect(page.getByRole("button", { name: /arrange grid/i })).toBeVisible();
  });

  test("project distribution widget shows legend table with project details", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Project Distribution" })).toBeVisible();

    const legend = page
      .getByRole("heading", { name: "Project Distribution" })
      .locator("..")
      .locator("..");
    await expect(legend.getByText("Project", { exact: true })).toBeVisible();
    await expect(legend.getByText("Hours", { exact: true })).toBeVisible();
    await expect(legend.getByText("%", { exact: true })).toBeVisible();
  });

  test("team activities widget shows member table columns", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Team Activities" })).toBeVisible();

    const widget = page
      .getByRole("heading", { name: "Team Activities" })
      .locator("..")
      .locator("..");
    await expect(widget.getByRole("columnheader", { name: "Member", exact: true })).toBeVisible();
    await expect(
      widget.getByRole("columnheader", { name: "Latest activity", exact: true })
    ).toBeVisible();
    await expect(widget.getByRole("columnheader", { name: "Duration", exact: true })).toBeVisible();
    await expect(
      widget.getByRole("columnheader", { name: "Time since", exact: true })
    ).toBeVisible();
    await expect(
      widget.getByRole("columnheader", { name: "This week", exact: true })
    ).toBeVisible();
    await expect(
      widget.getByRole("columnheader", { name: "Hours by day", exact: true })
    ).toBeVisible();
  });
});
