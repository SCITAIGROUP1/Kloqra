import type { Page } from "@playwright/test";

/** Expand the desktop sidebar so nav labels are visible and clickable in compact viewports. */
export async function ensurePlatformSidebarExpanded(page: Page): Promise<void> {
  const expand = page.getByRole("button", { name: "Expand sidebar" });
  if (await expand.isVisible().catch(() => false)) {
    await expand.click();
  }
}

/** Click a console nav link from the platform shell sidebar. */
export async function openPlatformConsoleNav(page: Page, label: string): Promise<void> {
  await ensurePlatformSidebarExpanded(page);
  const nav = page.getByRole("navigation", { name: "Platform navigation" }).first();
  await nav.getByRole("link", { name: label, exact: true }).click();
}
