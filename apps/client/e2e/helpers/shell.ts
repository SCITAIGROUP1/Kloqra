import { expect, type Page } from "@playwright/test";
import { waitForClientShell } from "./onboarding";

/** Sidebar nav in the client workspace shell. */
export function clientSidebar(page: Page) {
  return page.getByRole("complementary");
}

export async function expandClientSidebarIfCollapsed(page: Page) {
  const expand = page.getByRole("button", { name: "Expand sidebar" });
  if (await expand.isVisible()) {
    await expand.click();
  }
}

export function clientSidebarProfileLink(page: Page, name: string | RegExp) {
  return clientSidebar(page).getByRole("link", { name });
}

export async function openClientSettings(page: Page) {
  await waitForClientShell(page);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
}

export async function waitForProfilePage(page: Page) {
  await waitForClientShell(page);
  await expect(page.getByText("Unable to load profile")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible({ timeout: 60_000 });
}

export async function waitForSettingsPage(page: Page) {
  await waitForClientShell(page);
  await expect(page.getByText("Loading settings…")).toBeHidden({ timeout: 60_000 });
  await expect(page.getByText("Unable to load settings")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible({
    timeout: 60_000
  });
}

export async function expectWorkspaceSwitcherShows(page: Page, workspaceName: string) {
  const workspaceSwitcher = page.locator("button[aria-haspopup='listbox']").first();
  const ariaLabel = (await workspaceSwitcher.getAttribute("aria-label")) ?? "";
  if (ariaLabel.length > 0) {
    await expect(workspaceSwitcher).toHaveAttribute("aria-label", new RegExp(workspaceName, "i"));
    return;
  }
  await expect(workspaceSwitcher).toContainText(workspaceName.split(" ")[0]);
}

export async function clickSettingsNavSection(page: Page, label: string) {
  await page
    .getByRole("navigation", { name: "Settings" })
    .getByRole("button", { name: label, exact: true })
    .click();
}

export async function clickClientLogout(page: Page) {
  await expandClientSidebarIfCollapsed(page);
  await clientSidebar(page).getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/login/, { timeout: 30_000, waitUntil: "domcontentloaded" });
}
