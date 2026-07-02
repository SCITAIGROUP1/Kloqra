import { expect, test } from "@playwright/test";
import { loginPlatformAdmin } from "./helpers/platform-auth";

test.describe("Platform Subscriptions Console E2E", () => {
  test.beforeEach(async ({ page }) => {
    await loginPlatformAdmin(page);
  });

  test("can navigate to subscriptions list, filter by tabs, and search", async ({ page }) => {
    // Navigate via Sidebar
    const navLink = page.getByRole("link", { name: "Subscriptions" });
    await expect(navLink).toBeVisible();
    await navLink.click();

    // Verify list page loads
    await expect(page).toHaveURL(/\/subscriptions/);
    await expect(page.getByRole("heading", { name: "Subscriptions" })).toBeVisible();

    // Verify all work-queue tabs are present
    const tabs = ["All", "Needs action", "Past due", "Trials ending", "Sales pending", "Drift"];
    for (const tab of tabs) {
      await expect(page.getByRole("tab", { name: new RegExp(tab, "i") })).toBeVisible();
    }

    // Verify filters exist
    await expect(page.getByPlaceholder(/Search by organization name/i)).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Filter by plan" }).or(page.locator("select").first())
    ).toBeVisible();

    // Verify the list table is populated (e.g. containing Acme or Kloqra)
    // The seeded tenants should include Kloqra/Acme/etc. Let's wait for table cells to render.
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 15_000 });

    // Test tab filtering click
    await page.getByRole("tab", { name: /all/i }).click();
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    // Test search filter
    const searchInput = page.getByPlaceholder(/Search by organization name/i);
    await searchInput.fill("kloqra");
    await page.waitForTimeout(500); // Debounce
    // Should filter items
    await expect(page.locator("table tbody tr")).toBeVisible();
  });

  test("can view subscription details and event timeline", async ({ page }) => {
    await page.goto("/subscriptions");

    // Click the first tenant name link in the table to view details
    const firstTenantLink = page.locator("table tbody tr td a").first();
    await expect(firstTenantLink).toBeVisible();
    const tenantName = await firstTenantLink.innerText();
    await firstTenantLink.click();

    // Verify URL change to detail page
    await expect(page).toHaveURL(/\/subscriptions\/[a-f0-9-]+/);
    await expect(page.getByRole("heading", { name: tenantName })).toBeVisible();

    // Verify detail cards are rendered
    await expect(page.getByText("Billing Tenure", { exact: true })).toBeVisible();
    await expect(page.getByText("Billing Source", { exact: true })).toBeVisible();
    await expect(page.getByText("Current Plan", { exact: true })).toBeVisible();

    // Verify Event Timeline is visible
    await expect(page.getByText("Subscription Event History")).toBeVisible();
    await expect(
      page
        .locator(".border-l-2")
        .first()
        .or(page.getByText("No events recorded for this subscription yet."))
    ).toBeVisible();
  });

  test("can open Assign Plan dialog from detail page", async ({ page }) => {
    await page.goto("/subscriptions");

    // Click the first tenant name link in the table
    const firstTenantLink = page.locator("table tbody tr td a").first();
    await expect(firstTenantLink).toBeVisible();
    await firstTenantLink.click();

    // Verify Assign Plan button is present and click it
    const assignBtn = page.getByRole("button", { name: "Assign Plan" });
    await expect(assignBtn).toBeVisible();
    await assignBtn.click();

    // Verify Assign Plan dialog/modal is visible
    await expect(page.getByRole("dialog", { name: "Assign Subscription Plan" })).toBeVisible();
    await expect(page.getByLabel("Choose Plan")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });
});
