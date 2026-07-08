import { test, expect } from "@playwright/test";
import { SEED } from "./constants/seed";
import { loginAsAdmin, loginAsWorkspaceAdmin } from "./helpers/auth";
import { adminSidebarUserLink, clickAdminLogout } from "./helpers/shell";

test.describe("Admin session boundary", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("logout clears org admin session before workspace admin login", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await expect(
      adminSidebarUserLink(page, new RegExp(SEED.personas.tenantOwner.name, "i"))
    ).toBeVisible();

    await clickAdminLogout(page);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    await loginAsWorkspaceAdmin(page);
    await page.goto("/dashboard");
    await expect(
      adminSidebarUserLink(page, new RegExp(SEED.personas.acmeAdmin.name, "i"))
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: new RegExp(SEED.personas.tenantOwner.name, "i") })
    ).toHaveCount(0);
  });
});
