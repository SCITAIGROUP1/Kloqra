import { expect, test } from "@playwright/test";
import { loginPlatformAdmin } from "./helpers/platform-auth";

test("platform user can navigate to help desk", async ({ page }) => {
  await loginPlatformAdmin(page);
  await page.getByRole("link", { name: "Help Desk" }).click();
  await expect(page).toHaveURL(/\/helpdesk/);
  await expect(page.getByRole("heading", { name: "All Tickets" })).toBeVisible();
});
