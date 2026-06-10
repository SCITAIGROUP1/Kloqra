import { test, expect } from "@playwright/test";

test.describe("Time Tracker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "member@kloqra.dev");
    await page.fill("#password", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/timer");
    await page.goto("/time-tracker");
    await expect(page.getByRole("heading", { name: "Time Tracker", exact: true })).toBeVisible();
  });

  test("shows stat cards, filters, and week-grouped list shell", async ({ page }) => {
    await expect(page.getByText("This Week", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Billable", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Pending Approval", { exact: true })).toBeVisible();
    await expect(page.getByText("Entries", { exact: true }).first()).toBeVisible();
    await expect(page.getByPlaceholder("Search entries...")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Entry" })).toBeVisible();
  });

  test("opens add entry dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Add Entry" }).click();
    await expect(page.getByRole("heading", { name: "Add time entry" })).toBeVisible();
  });

  test("expands filters panel with category and task controls", async ({ page }) => {
    await page.getByRole("button", { name: /Filters/i }).click();
    await expect(page.getByLabel("Category")).toBeVisible();
    await expect(page.getByLabel("Task")).toBeVisible();
  });
});
