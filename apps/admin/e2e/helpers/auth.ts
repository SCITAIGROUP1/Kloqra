import type { Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@kloqra.dev";
const ADMIN_PASSWORD = "password123";
const ACME_WORKSPACE_ADMIN_EMAIL = "acme-admin@kloqra.dev";

export async function completePostLoginSelection(page: Page, workspaceName = "Acme Corporation") {
  // Wait a bit to see which page it lands on
  await page.waitForURL(/.*(select-context|select-workspace|dashboard|account)/, {
    timeout: 30_000
  });

  if (page.url().includes("select-context")) {
    await page.getByRole("button", { name: new RegExp(workspaceName, "i") }).click();
    await page.waitForURL(/.*(select-workspace|dashboard|account)/, { timeout: 30_000 });
  }

  if (page.url().includes("select-workspace")) {
    await page.locator("button").filter({ hasText: workspaceName }).first().click();
    await page.waitForURL(/.*(dashboard|account)/, { timeout: 30_000 });
  }
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[type='email']", ADMIN_EMAIL);
  await page.fill("input[type='password']", ADMIN_PASSWORD);
  await page.click("button[type='submit']");

  await page.waitForURL(/.*(select-context|select-workspace|dashboard|account)/, {
    timeout: 30_000
  });

  await completePostLoginSelection(page);
}

const ORG_ADMIN_EMAIL = "ops@kloqra.dev";

export async function loginAsOrganizationAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[type='email']", ORG_ADMIN_EMAIL);
  await page.fill("input[type='password']", ADMIN_PASSWORD);
  await page.click("button[type='submit']");

  await page.waitForURL(/.*(select-context|select-workspace|dashboard|account)/, {
    timeout: 30_000
  });

  await completePostLoginSelection(page);
}
export async function loginAsWorkspaceAdmin(page: Page) {
  await page.goto("/login");
  await page.fill("input[type='email']", ACME_WORKSPACE_ADMIN_EMAIL);
  await page.fill("input[type='password']", ADMIN_PASSWORD);
  await page.click("button[type='submit']");

  await page.waitForURL(/.*(select-context|select-workspace|dashboard|account)/, {
    timeout: 30_000
  });

  await completePostLoginSelection(page);
}
