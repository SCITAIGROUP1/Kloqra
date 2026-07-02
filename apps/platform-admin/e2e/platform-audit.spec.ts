import { expect, test } from "@playwright/test";
import { loginPlatformAdmin } from "./helpers/platform-auth";

test("platform superadmin can view audit log", async ({ page }) => {
  await loginPlatformAdmin(page);
  await page.getByRole("link", { name: "Audit log" }).click();
  await expect(page).toHaveURL(/\/audit/);
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();

  await expect(page.getByText("platform.login").first()).toBeVisible({ timeout: 15_000 });
});
