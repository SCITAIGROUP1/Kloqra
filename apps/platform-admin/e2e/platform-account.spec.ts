import { expect, test } from "@playwright/test";
import { loginPlatformAdmin } from "./helpers/platform-auth";

test.describe("Platform account pages", () => {
  test.beforeEach(async ({ page }) => {
    await loginPlatformAdmin(page);
  });

  test("profile page loads and saves name", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    const nameInput = page.getByLabel(/display name/i);
    await nameInput.fill("Platform E2E");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/profile updated/i)).toBeVisible();
  });

  test("settings page loads appearance section", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  });

  test("notifications page loads", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  });
});
