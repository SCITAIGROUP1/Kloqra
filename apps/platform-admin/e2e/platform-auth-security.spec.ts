import { PLATFORM_HERO_TAGLINE, PLATFORM_SECURITY_NOTE } from "@kloqra/contracts";
import { expect, test } from "@playwright/test";
import { loginPlatformAdmin } from "./helpers/platform-auth";

test.describe("Platform auth security", () => {
  test("login shows platform hero copy and forgot password link", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Platform sign in" })).toBeVisible();
    await expect(page.getByText(PLATFORM_HERO_TAGLINE)).toBeVisible();
    await expect(page.getByText(PLATFORM_SECURITY_NOTE)).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
  });

  test("forgot password page submits successfully", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("platform@kloqra.dev");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/If an account exists/i)).toBeVisible();
  });

  test("sign in reaches tenants without mandatory 2FA", async ({ page }) => {
    await loginPlatformAdmin(page);
    await expect(page.getByRole("heading", { name: "Tenants" })).toBeVisible();
  });
});
