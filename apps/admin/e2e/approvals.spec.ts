import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Admin Approvals", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("navigates to dedicated approvals page", async ({ page }) => {
    await page.goto("/approvals");
    await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible();
    await expect(page.getByText(/review submitted timesheets/i)).toBeVisible();
  });

  test("shows approvals filter controls", async ({ page }) => {
    await page.goto("/approvals");
    await expect(page.getByText("Project")).toBeVisible();
    await expect(page.getByText("Member")).toBeVisible();
    await expect(page.getByText("Period range")).toBeVisible();
  });

  test("team page is live activity only", async ({ page }) => {
    await page.goto("/team");
    await expect(page.getByRole("heading", { name: "Team Live" })).toBeVisible();
    await expect(page.getByText("Timesheet Approvals")).toHaveCount(0);
  });
});
