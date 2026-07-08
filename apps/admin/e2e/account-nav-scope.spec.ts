import { test, expect, type Page } from "@playwright/test";
import { SEED } from "./constants/seed";
import { loginAsAdmin, loginAsOrganizationAdmin } from "./helpers/auth";
import {
  adminSidebarUserLink,
  clickAdminSidebarLink,
  clickSettingsNavSection,
  waitForAdminShell,
  waitForProfilePage,
  waitForSettingsPage
} from "./helpers/shell";

async function expandSidebarIfCollapsed(page: Page) {
  const expand = page.getByRole("button", { name: "Expand sidebar" });
  if (await expand.isVisible()) {
    await expand.click();
  }
}

async function openContextSwitcher(page: Page) {
  await expandSidebarIfCollapsed(page);
  await page.getByRole("button", { name: /switch context/i }).click();
}

test.describe("Admin nav scope by role", () => {
  test("tenant owner sees workspace nav on dashboard without account sidebar links", async ({
    page
  }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Kloqra Admin Portal" }).first()).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Subscription" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Organization", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Owner · Workspace admin/i })).toBeVisible();

    await openContextSwitcher(page);
    await expect(page.getByRole("option", { name: /organization.*owner/i })).toBeVisible();
    await expect(page.getByText("Switch context")).toBeVisible();
  });

  test("tenant owner sees organization chrome on account routes", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/account");
    await expect(page.getByRole("link", { name: "Kloqra Organization" }).first()).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByRole("link", { name: "Overview" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Subscription" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Organization owner/i })).toBeVisible();

    await openContextSwitcher(page);
    await expect(page.getByRole("option", { name: /organization.*owner/i })).toBeVisible();
    const acmeRegex = new RegExp(SEED.workspaces.acme.name, "i");
    await expect(page.getByRole("option", { name: acmeRegex })).toBeVisible();
  });

  test("tenant owner keeps organization chrome on profile and settings", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/account");
    await waitForAdminShell(page);
    await expect(page.getByRole("link", { name: "Kloqra Organization" }).first()).toBeVisible({
      timeout: 30_000
    });

    await clickAdminSidebarLink(page, "Settings");
    await expect(page).toHaveURL(/\/account\/settings/, { timeout: 15_000 });
    await waitForSettingsPage(page);
    await expect(page.getByRole("link", { name: "Kloqra Organization" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();

    await adminSidebarUserLink(page, /Avery Org Owner/i).click();
    await expect(page).toHaveURL(/\/account\/profile/, { timeout: 15_000 });
    await waitForProfilePage(page);
    await expect(page.getByRole("link", { name: "Kloqra Organization" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByLabel(/display name|first name/i).first()).toBeVisible();
  });

  test("tenant owner sees workspace creation notification preference in organization settings", async ({
    page
  }) => {
    await loginAsAdmin(page);
    await page.goto("/account");
    await waitForAdminShell(page);

    await clickAdminSidebarLink(page, "Settings");
    await expect(page).toHaveURL(/\/account\/settings/, { timeout: 15_000 });
    await waitForSettingsPage(page);
    await clickSettingsNavSection(page, "Notifications");
    await expect(page).toHaveURL(/section=notifications/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByText("Workspace Creation")).toBeVisible();
    await expect(
      page.getByText("When a new workspace is created in your organization")
    ).toBeVisible();
  });

  test("organization admin sees limited account nav", async ({ page }) => {
    await loginAsOrganizationAdmin(page);
    await page.goto("/account/workspaces");
    await expect(page.getByRole("link", { name: "Kloqra Organization" }).first()).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByRole("link", { name: "Workspaces" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Workspace admins" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Overview" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Subscription" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

    await page.goto("/account");
    await waitForAdminShell(page);
    await expect(page).toHaveURL(/account\/workspaces/, { timeout: 15_000 });
  });
});
