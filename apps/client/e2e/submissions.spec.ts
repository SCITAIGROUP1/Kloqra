import { test, expect } from "@playwright/test";

test.describe("Member Submissions", () => {
  test("navigates to submissions page", async ({ page }) => {
    await page.goto("/submissions");
    await expect(page.getByRole("heading", { name: "Submissions" })).toBeVisible();
    await expect(page.getByText(/submit timesheets for review/i)).toBeVisible();
  });

  test("legacy approvals route redirects to submissions", async ({ page }) => {
    await page.goto("/approvals");
    await expect(page).toHaveURL(/\/submissions/);
  });

  test("shows status tabs and table view", async ({ page }) => {
    await page.goto("/submissions");
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Action needed/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Period" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Project" })).toBeVisible();
  });

  test("timesheet page links to submissions when actionable", async ({ page }) => {
    await page.goto("/timesheet");
    const cta = page.getByRole("link", { name: /ready to submit/i });
    if ((await cta.count()) > 0) {
      await cta.click();
      await expect(page).toHaveURL(/\/submissions/);
    }
  });
});
