import { test as setup } from "@playwright/test";

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? "http://localhost:3002";
const AUTH_FILE = "e2e/.auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  await page.goto(`${ADMIN_BASE_URL}/login`);
  await page.fill("input[type='email']", "admin@kloqra.dev");
  await page.fill("input[type='password']", "password123");
  await page.click("button[type='submit']");

  await page.waitForURL(/.*(select-context|select-workspace|dashboard|account)/, {
    timeout: 30_000
  });

  if (page.url().includes("select-context")) {
    await page.locator("button").filter({ hasText: "Kloqra" }).first().click();
    await page.waitForURL(/.*(select-workspace|dashboard|account)/, { timeout: 30_000 });
  }

  if (page.url().includes("select-workspace")) {
    await page.locator("button").filter({ hasText: "Acme Corporation" }).first().click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
  }

  await page.context().storageState({ path: AUTH_FILE });
});
