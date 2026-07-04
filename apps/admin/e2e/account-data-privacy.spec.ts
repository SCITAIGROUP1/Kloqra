import { test, expect } from "@playwright/test";

test("tenant owner can navigate to data privacy page", async ({ page }) => {
  await page.goto("/account/data-privacy");
  await expect(page).toHaveURL(/\/account\/data-privacy/);
});
