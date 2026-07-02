import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin, loginAsOrganizationAdmin } from "./helpers/auth";

async function _expandSidebarIfCollapsed(page: Page) {
  const expand = page.getByRole("button", { name: "Expand sidebar" });
  if (await expand.isVisible()) {
    await expand.click();
  }
}

test.describe("Account workspace admins", () => {
  test("organization owner can open workspace admins page with filters", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/account/workspace-admins");
    await expect(page.getByRole("heading", { name: /workspace admins/i })).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByRole("textbox", { name: /search workspace admins/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /assign workspace admin/i })).toBeVisible();
  });

  test("organization admin can manage workspace admins but not billing", async ({ page }) => {
    await loginAsOrganizationAdmin(page);
    await page.goto("/account/workspace-admins");
    await expect(page.getByRole("heading", { name: /workspace admins/i })).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByRole("link", { name: "Workspace admins" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Subscription" })).toHaveCount(0);

    await page.goto("/account/billing");
    await expect(page).toHaveURL(/account\/workspaces/, { timeout: 15_000 });
  });
});

test.describe("Organization members", () => {
  test("organization owner can invite organization admin", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/account/members");
    await expect(page.getByRole("heading", { name: /organization members/i })).toBeVisible({
      timeout: 30_000
    });
    await page.getByRole("button", { name: /invite organization admin/i }).click();
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
