import { expect, test } from "@playwright/test";
import { loginPlatformAdmin } from "./helpers/platform-auth";

test("platform superadmin can sign in and see tenant list", async ({ page }) => {
  await loginPlatformAdmin(page);
  await expect(page.getByRole("heading", { name: "Tenants" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kloqra Demo Organization" })).toBeVisible();
});
