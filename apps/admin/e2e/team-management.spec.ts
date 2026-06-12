import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Team Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("shows team management page with stats and member table", async ({ page }) => {
    await page.goto("/team-management");
    await expect(page.getByRole("heading", { name: "Team Management" })).toBeVisible();
    await expect(page.getByText("Total Members")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Member" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Team Member" })).toBeVisible();
  });

  test("opens add team member modal with email field", async ({ page }) => {
    await page.goto("/team-management");
    await page.getByRole("button", { name: "Add Team Member" }).click();
    await expect(page.getByRole("heading", { name: "Add team member" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByText("New users receive sign-in credentials by email.")).toBeVisible();
  });
});
