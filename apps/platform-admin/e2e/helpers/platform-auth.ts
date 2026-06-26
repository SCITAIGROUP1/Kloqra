import { expect, type Page } from "@playwright/test";
import { generateSync } from "otplib";

let cachedTotpSecret: string | null = null;

export async function loginPlatformAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("platform@kloqra.dev");
  await page.locator("input[id='password']").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  if (page.url().includes("/setup-2fa")) {
    await expect(page.getByText(/Scan with your authenticator app/i)).toBeVisible();
    const secretDisplay = await page.locator("code").first().innerText();
    cachedTotpSecret = secretDisplay.replace(/\s/g, "");
    const code = await generateSync({ secret: cachedTotpSecret });
    await page.getByLabel(/authentication code/i).fill(code);
    await page.getByRole("button", { name: /enable and continue/i }).click();
    await page.waitForURL(/.*(select-context|tenants)/);
  } else if (
    await page
      .getByLabel("Authentication code")
      .isVisible()
      .catch(() => false)
  ) {
    if (!cachedTotpSecret) {
      throw new Error("Platform 2FA is enabled but no cached TOTP secret in Playwright tests");
    }
    const code = await generateSync({ secret: cachedTotpSecret });
    await page.getByLabel("Authentication code").fill(code);
    await page.getByRole("button", { name: "Verify" }).click();
    await page.waitForURL(/.*(select-context|tenants)/);
  } else {
    await page.waitForURL(/.*(select-context|tenants)/);
  }

  if (page.url().includes("select-context")) {
    await page.locator("button").filter({ hasText: "Kloqra" }).first().click();
    await page.waitForURL(/\/tenants/);
  }
}
