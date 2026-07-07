import { expect, type Page } from "@playwright/test";

/** Wait until admin shell finished bootstrapping (not login/loading). */
export async function waitForAdminShell(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.getByText("Loading workspace…")).toBeHidden({ timeout: 30_000 });
}
