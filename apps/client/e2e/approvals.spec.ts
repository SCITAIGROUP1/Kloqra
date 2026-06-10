import { test, expect } from "@playwright/test";

test.describe("Member Approvals", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", "drew@kloqra.dev");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
  });

  test("navigates to approvals page", async ({ page }) => {
    await page.goto("/approvals");
    await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible();
    await expect(page.getByText(/send your timesheets for review/i)).toBeVisible();
  });

  test("timesheet page links to approvals when actionable", async ({ page }) => {
    await page.goto("/timesheet");
    const cta = page.getByRole("link", { name: /ready to send/i });
    if ((await cta.count()) > 0) {
      await cta.click();
      await expect(page).toHaveURL(/\/approvals/);
    }
  });
});
