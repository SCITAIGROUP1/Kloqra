import type { Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@kloqra.dev";
const ADMIN_PASSWORD = "password123";

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[type='email']", ADMIN_EMAIL);
  await page.fill("input[type='password']", ADMIN_PASSWORD);
  await page.click("button[type='submit']");
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
}
