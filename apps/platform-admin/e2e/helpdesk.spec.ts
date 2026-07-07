import { expect, test } from "@playwright/test";
import { loginPlatformAdmin } from "./helpers/platform-auth";
import { openPlatformConsoleNav } from "./helpers/platform-nav";

test("platform user can navigate to help desk", async ({ page }) => {
  await loginPlatformAdmin(page);
  await Promise.all([
    page.waitForURL(/\/helpdesk/, { timeout: 15_000 }),
    openPlatformConsoleNav(page, "Help Desk")
  ]);
  await expect(page.getByRole("heading", { name: "All Tickets" })).toBeVisible();
});
