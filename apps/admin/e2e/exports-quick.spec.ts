import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import { assertNoHorizontalPageOverflow, useCompactLaptopViewport } from "./helpers/overflow";

test.describe("exports quick flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("shows scenario picker and quick reports mode", async ({ page }) => {
    await page.goto("/exports");
    await expect(page.getByRole("heading", { name: "Exports", exact: true })).toBeVisible();
    await expect(page.getByText("Quick reports")).toBeVisible();
    await expect(page.getByText("Payroll & timesheets")).toBeVisible();
    await expect(page.getByText("Team summary")).toBeVisible();
  });

  test("dashboard export period link opens exports with dates", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Export this period" }).click();
    await expect(page).toHaveURL(/\/exports\?from=/);
    await expect(page.getByText("Payroll & timesheets")).toBeVisible();
  });

  test("exports page does not horizontally overflow on a 1366×768 laptop viewport", async ({
    page
  }) => {
    await useCompactLaptopViewport(page);
    await page.goto("/exports");
    await expect(page.getByRole("heading", { name: "Exports", exact: true })).toBeVisible();
    await assertNoHorizontalPageOverflow(page);
  });

  test("custom export mode does not horizontally overflow on a 1366×768 laptop viewport", async ({
    page
  }) => {
    await useCompactLaptopViewport(page);
    await page.goto("/exports");
    await page.getByRole("button", { name: "Custom export" }).click();
    await expect(page.getByText("Period & filters")).toBeVisible();
    await expect(page.getByText("Review & download")).toBeVisible();
    // Wait for the live preview request to settle (networkidle is flaky in CI dev servers).
    await expect(page.getByRole("button", { name: "Excel" })).toBeVisible({ timeout: 15_000 });
    await assertNoHorizontalPageOverflow(page);
  });
});
