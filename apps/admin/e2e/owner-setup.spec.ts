import { expect, test } from "@playwright/test";

const PENDING_TENANT = {
  id: "00000000-0000-4000-8000-000000000099",
  name: "Provisioned Org",
  slug: "provisioned-org",
  status: "pending_setup",
  settings: {},
  createdAt: "2026-06-24T12:00:00.000Z"
};

test("provisioned owner sees organization setup form", async ({ page }) => {
  await page.route("**/tenants/current", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PENDING_TENANT)
    });
  });

  await page.goto("/account/organization");
  await expect(page.getByRole("heading", { name: "Finish setup" })).toBeVisible({
    timeout: 30_000
  });
  await expect(page.getByLabel("Organization name")).toBeVisible();
  await expect(page.getByLabel("Organization ID")).toBeVisible();
});
