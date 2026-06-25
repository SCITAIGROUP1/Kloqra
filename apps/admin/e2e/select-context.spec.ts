import { test, expect } from "@playwright/test";

test.describe("Admin context picker", () => {
  test("owner with multiple workspaces lands on select-context after login", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", "admin@kloqra.dev");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");

    await expect(page).toHaveURL(/select-context/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Choose how you want to work" })).toBeVisible();
    await expect(page.getByText("Organization · Owner")).toBeVisible();
    await expect(page.getByText("Meridian Product Co")).toBeVisible();
  });

  test("owner can choose organization context from picker", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", "admin@kloqra.dev");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/select-context/, { timeout: 30_000 });

    await page.getByRole("button", { name: /kloqra demo organization/i }).click();
    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });
    await expect(page.getByRole("navigation", { name: "Current context" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Current context" }).getByText("Organization", {
        exact: true
      })
    ).toBeVisible();
  });

  test("owner can choose workspace context from picker", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", "admin@kloqra.dev");
    await page.fill("input[type='password']", "password123");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/select-context/, { timeout: 30_000 });

    await page.getByRole("button", { name: /acme corporation/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole("navigation", { name: "Current context" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Current context" }).getByText("Owner · Workspace admin")
    ).toBeVisible();
  });
});
