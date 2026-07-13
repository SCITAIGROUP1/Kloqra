import { test, expect, type Page } from "@playwright/test";
import { SEED } from "./constants/seed";

test.describe("Admin context picker", () => {
  // Fresh login required — shared admin storageState skips the form and lands mid-session.
  test.use({ storageState: { cookies: [], origins: [] } });

  async function loginAsOwner(page: Page) {
    await page.goto("/login");
    await page.locator("input[type='email']").fill(SEED.personas.tenantOwner.email);
    const password = page.locator("input[type='password']");
    await password.fill(SEED.personas.tenantOwner.password);
    await password.press("Enter");
    await expect(page).toHaveURL(/select-context/, { timeout: 30_000 });
  }

  test("owner with multiple workspaces lands on select-context after login", async ({ page }) => {
    await loginAsOwner(page);

    await expect(page.getByRole("heading", { name: "Choose how you want to work" })).toBeVisible();
    await expect(page.getByText("Organization · Owner")).toBeVisible();
    await expect(page.getByText(SEED.workspaces.meridian.name)).toBeVisible();
  });

  test("owner can choose organization context from picker", async ({ page }) => {
    await loginAsOwner(page);

    const tenantNameRegex = new RegExp(SEED.tenant.name, "i");
    await page.getByRole("button", { name: tenantNameRegex }).click({ force: true });
    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Organization owner/i })).toBeVisible();
  });

  test("owner can choose workspace context from picker", async ({ page }) => {
    await loginAsOwner(page);

    const acmeNameRegex = new RegExp(SEED.workspaces.acme.name, "i");
    await page.getByRole("button", { name: acmeNameRegex }).click({ force: true });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Owner · Workspace admin/i })).toBeVisible();
  });
});
