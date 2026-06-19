import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";

test.describe("Time Tracker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/time-tracker");
    await dismissOnboardingIfVisible(page);
    await expect(page.getByRole("heading", { name: "Time Tracker", exact: true })).toBeVisible();
  });

  test("shows stat cards, filters, and week-grouped list shell", async ({ page }) => {
    await expect(page.getByText("This Week", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Billable", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Pending Approval", { exact: true })).toBeVisible();
    await expect(page.getByText("Entries", { exact: true }).first()).toBeVisible();
    await expect(page.getByPlaceholder("Search entries...")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Entry" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Date range" })).toBeVisible();
  });

  test("supports custom date range selection while keeping week sections", async ({ page }) => {
    await page.getByRole("button", { name: "Date range" }).click();
    await page.getByRole("button", { name: "2026-06-01" }).click();
    await page.getByRole("button", { name: "2026-06-14" }).click();
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("combobox", { name: "Time period" })).toContainText("Custom range");
    await expect(page.getByText(/Week of/i).first()).toBeVisible();
    await expect(page.getByText(/Week 1 of/i)).toBeVisible();
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
