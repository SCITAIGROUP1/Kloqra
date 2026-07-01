import type { Page } from "@playwright/test";

const MEMBER_EMAIL = "member@kloqra.dev";
const PASSWORD = "password123";

async function submitLogin(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[type='email']", email);
  await page.fill("input[type='password']", PASSWORD);
  await page.click("button[type='submit']");

  await page.waitForURL(/.*(select-workspace|dashboard|timer|timesheet|time-tracker)/, {
    timeout: 30_000
  });

  if (page.url().includes("select-workspace")) {
    await page.locator("button").filter({ hasText: "Softcodeit" }).first().click();
    await page.waitForURL(/\/(dashboard|timer|timesheet|time-tracker)/, { timeout: 30_000 });
  }
}

export async function loginAsMember(page: Page) {
  await submitLogin(page, MEMBER_EMAIL);
}
