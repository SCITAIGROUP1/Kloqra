import { test, expect } from "@playwright/test";

test.describe("Client dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "member@chronomint.dev");
    await page.fill("#password", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/timer");
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  });

  test("shows collapsible scope filters for project, category, and task", async ({ page }) => {
    await page.getByRole("button", { name: /scope filters/i }).click();
    await expect(page.getByText("Project", { exact: true })).toBeVisible();
    await expect(page.getByText("Category", { exact: true })).toBeVisible();
    await expect(page.getByText("Task", { exact: true })).toBeVisible();
  });
});
