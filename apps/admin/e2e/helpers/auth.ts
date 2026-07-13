import type { Page } from "@playwright/test";
import { SEED } from "../constants/seed";
import { dismissNextDevToolsIfOpen } from "./shell";

const ADMIN_EMAIL = SEED.personas.tenantOwner.email;
const ADMIN_PASSWORD = SEED.personas.tenantOwner.password;
const ACME_WORKSPACE_ADMIN_EMAIL = SEED.personas.acmeAdmin.email;
const ORG_ADMIN_EMAIL = SEED.personas.tenantAdmin.email;

const POST_AUTH_URL = /\/(select-context|select-workspace|dashboard|account)(\/|\?|$)/;

export async function completePostLoginSelection(
  page: Page,
  workspaceName = SEED.workspaces.acme.name
) {
  await page.waitForURL(POST_AUTH_URL, {
    timeout: 30_000
  });
  await dismissNextDevToolsIfOpen(page);

  if (page.url().includes("select-context")) {
    await page.getByRole("button", { name: new RegExp(workspaceName, "i") }).click({ force: true });
    await page.waitForURL(/\/(select-workspace|dashboard|account)(\/|\?|$)/, { timeout: 30_000 });
  }

  if (page.url().includes("select-workspace")) {
    await dismissNextDevToolsIfOpen(page);
    await page.locator("button").filter({ hasText: workspaceName }).first().click({ force: true });
    await page.waitForURL(/\/(dashboard|account)(\/|\?|$)/, { timeout: 30_000 });
  }
}

/** Clear admin tokens so a different persona can sign in. */
export async function clearAdminBrowserSession(page: Page) {
  await page.goto("/login");
  await page.evaluate(() => {
    for (const key of [
      "cm-admin-access-token",
      "cm-admin-workspace-id",
      "cm-admin-refresh-token"
    ]) {
      localStorage.removeItem(key);
    }
  });
  await page.context().clearCookies();
}

async function submitLoginForm(page: Page, email: string, password: string) {
  const emailInput = page.locator("input[type='email']");
  await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  await emailInput.fill(email);
  const passwordInput = page.locator("input[type='password']");
  await passwordInput.fill(password);
  // Prefer Enter over clicking submit — Next.js dev overlay can intercept pointer events.
  await passwordInput.press("Enter");
  await page.waitForURL(POST_AUTH_URL, { timeout: 30_000 });
  await completePostLoginSelection(page);
}

/**
 * Ensure the tenant-owner admin session is active.
 * With Playwright storageState, /login often redirects straight to select-context —
 * do not wait for the email field in that case.
 */
export async function loginAsAdmin(page: Page) {
  await page.goto("/login");

  const emailInput = page.locator("input[type='email']");
  await Promise.race([
    emailInput.waitFor({ state: "visible", timeout: 30_000 }),
    page.waitForURL(POST_AUTH_URL, { timeout: 30_000 })
  ]);

  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(ADMIN_EMAIL);
    const passwordInput = page.locator("input[type='password']");
    await passwordInput.fill(ADMIN_PASSWORD);
    await passwordInput.press("Enter");
    await page.waitForURL(POST_AUTH_URL, { timeout: 30_000 });
  }

  await completePostLoginSelection(page);
}

export async function loginAsOrganizationAdmin(page: Page) {
  await clearAdminBrowserSession(page);
  await page.goto("/login");
  await submitLoginForm(page, ORG_ADMIN_EMAIL, ADMIN_PASSWORD);
}

export async function loginAsWorkspaceAdmin(page: Page) {
  await clearAdminBrowserSession(page);
  await page.goto("/login");
  await submitLoginForm(page, ACME_WORKSPACE_ADMIN_EMAIL, ADMIN_PASSWORD);
}
