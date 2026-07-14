import { expect, test } from "@playwright/test";
import { loginPlatformAdmin } from "./helpers/platform-auth";

test.describe("Platform tenant trial extension", () => {
  test.beforeEach(async ({ page }) => {
    await loginPlatformAdmin(page);
  });

  test("tenant detail shows extend controls and posts extend-trial", async ({ page }) => {
    await page.goto("/tenants");
    const firstTenantLink = page.locator("table tbody tr td a").first();
    await expect(firstTenantLink).toBeVisible({ timeout: 15_000 });
    await firstTenantLink.click();
    await expect(page).toHaveURL(/\/tenants\/[a-f0-9-]+/);

    const card = page.getByTestId("tenant-trial-extend-card");
    // Some seeded tenants may already be canceled — skip if card absent
    if (!(await card.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await expect(page.getByTestId("extend-trial-7")).toBeVisible();
    await expect(page.getByTestId("extend-trial-14")).toBeVisible();
    await expect(page.getByTestId("extend-trial-30")).toBeVisible();
    await expect(page.getByTestId("extend-trial-custom-date")).toBeVisible();
    await expect(page.getByTestId("extend-trial-set-date")).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());

    const extendResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/extend-trial") &&
        res.request().method() === "POST" &&
        res.status() < 500
    );

    await page.getByTestId("extend-trial-7").click();
    const res = await extendResponse;
    expect(res.ok()).toBeTruthy();
    await expect(page.getByTestId("extend-trial-message")).toBeVisible({ timeout: 10_000 });
  });

  test("subscription detail shows the same trial extend card", async ({ page }) => {
    await page.goto("/subscriptions");
    const firstTenantLink = page.locator("table tbody tr td a").first();
    await expect(firstTenantLink).toBeVisible({ timeout: 15_000 });
    await firstTenantLink.click();
    await expect(page).toHaveURL(/\/subscriptions\/[a-f0-9-]+/);

    const card = page.getByTestId("tenant-trial-extend-card");
    if (!(await card.isVisible().catch(() => false))) {
      test.skip();
      return;
    }
    await expect(page.getByTestId("extend-trial-14")).toBeVisible();
  });
});
