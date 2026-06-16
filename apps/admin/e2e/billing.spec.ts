import { test, expect } from "@playwright/test";

test.describe("Admin billing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/billing");
    await expect(page.getByRole("heading", { name: "Billing", exact: true })).toBeVisible();
  });

  test("shows scope filter in the app bar toolbar", async ({ page }) => {
    const scopeFilter = page.getByRole("combobox", { name: "Filter by scope" });
    await expect(scopeFilter).toBeVisible();
    await expect(scopeFilter).toHaveText("All scopes");

    await scopeFilter.click();
    await expect(page.getByRole("option", { name: "Workspace default" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Per member" })).toBeVisible();
    await page.getByRole("option", { name: "Workspace default" }).click();
    await expect(scopeFilter).toHaveText("Workspace default");
  });
});
