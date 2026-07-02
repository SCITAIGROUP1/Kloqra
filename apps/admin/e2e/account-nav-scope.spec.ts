import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin, loginAsOrganizationAdmin } from "./helpers/auth";

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
    await expect(page.getByRole("navigation", { name: "Current context" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Current context" }).getByText("Owner · Workspace admin")
    ).toBeVisible();

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
    await expect(page.getByRole("navigation", { name: "Current context" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Current context" }).getByText("Organization", {
        exact: true
      })
    ).toBeVisible();

    await openContextSwitcher(page);
    await expect(page.getByRole("option", { name: /organization.*owner/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /acme corporation/i })).toBeVisible();
  });

  test("tenant owner keeps organization chrome on profile and settings", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/account");
    await expect(page.getByRole("link", { name: "Kloqra Organization" }).first()).toBeVisible({
      timeout: 30_000
    });

    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/, { timeout: 15_000 });
    await expect(page.getByRole("link", { name: "Kloqra Organization" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();

    await page.goto("/profile");
    await expect(page.getByRole("link", { name: "Kloqra Organization" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByLabel(/display name|first name/i).first()).toBeVisible();
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
    await expect(page).toHaveURL(/account\/workspaces/, { timeout: 15_000 });
  });
});
