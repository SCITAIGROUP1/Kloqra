import { expect, type Page } from "@playwright/test";

/** Wait until admin shell finished bootstrapping (not login/loading). */
export async function waitForAdminShell(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.getByText("Loading workspace…")).toBeHidden({ timeout: 30_000 });
}

/** Sidebar nav in workspace or account mode — avoids duplicate header/profile matches. */
export function adminSidebar(page: Page) {
  return page.getByRole("complementary");
}

export async function expandSidebarIfCollapsed(page: Page) {
  const expand = page.getByRole("button", { name: "Expand sidebar" });
  if (await expand.isVisible()) {
    await expand.click();
  }
}

export async function clickAdminSidebarLink(page: Page, label: string) {
  await expandSidebarIfCollapsed(page);
  await adminSidebar(page).getByRole("link", { name: label, exact: true }).click();
}

/** User avatar link in the shell sidebar footer. */
export function adminSidebarUserLink(page: Page, name: string | RegExp) {
  return adminSidebar(page).getByRole("link", { name });
}

export async function dismissNextDevToolsIfOpen(page: Page) {
  const close = page.getByRole("button", { name: "Close Next.js Dev Tools" });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
}

export async function waitForSettingsPage(page: Page) {
  await waitForAdminShell(page);
  await expect(page.getByText("Loading settings…")).toBeHidden({ timeout: 60_000 });
  await expect(page.getByText("Unable to load settings")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible({
    timeout: 60_000
  });
}

export async function waitForProfilePage(page: Page) {
  await waitForAdminShell(page);
  await expect(page.getByText("Unable to load profile")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible({ timeout: 60_000 });
}

export async function clickSettingsNavSection(page: Page, label: string) {
  await page
    .getByRole("navigation", { name: "Settings" })
    .getByRole("button", { name: label, exact: true })
    .click();
}

export async function clickAdminLogout(page: Page) {
  await dismissNextDevToolsIfOpen(page);
  await expandSidebarIfCollapsed(page);
  const logout = adminSidebar(page).getByRole("button", { name: "Log out" });
  await logout.scrollIntoViewIfNeeded();
  await logout.click();
  await page.waitForURL(/\/login/, { timeout: 30_000 });
}
