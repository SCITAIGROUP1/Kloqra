import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { SEED } from "../constants/seed";

const MEMBER_EMAIL = SEED.personas.member.email;
const DREW_EMAIL = SEED.personas.drew.email;
const PASSWORD = SEED.personas.member.password;

async function submitLogin(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("input[type='email']", email);
  await page.fill("input[type='password']", PASSWORD);
  await page.click("button[type='submit']");

  await page.waitForURL(
    /.*(select-context|select-workspace|dashboard|timer|timesheet|time-tracker)/,
    {
      timeout: 30_000
    }
  );

  if (page.url().includes("select-context")) {
    // Kloqra Demo Organization -> Kloqra matches
    const searchContext = SEED.tenant.name.split(" ")[0];
    await page.locator("button").filter({ hasText: searchContext }).first().click();
    await page.waitForURL(/.*(select-workspace|dashboard|timer|timesheet|time-tracker)/, {
      timeout: 30_000
    });
  }

  if (page.url().includes("select-workspace")) {
    await page.locator("button").filter({ hasText: SEED.workspaces.acme.name }).first().click();
    await page.waitForURL(/\/(dashboard|timer|timesheet|time-tracker)/, { timeout: 30_000 });
  }
}

export async function loginAsMember(page: Page) {
  await submitLogin(page, MEMBER_EMAIL);
}

export async function loginAsDrew(page: Page) {
  await submitLogin(page, DREW_EMAIL);
}

export async function logoutFromClient(page: Page) {
  const { clickClientLogout } = await import("./shell");
  await clickClientLogout(page);
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
}
