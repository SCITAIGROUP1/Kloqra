import { test, expect } from "@playwright/test";

test("tenant owner sees organization rollup on account overview", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: /account overview/i })).toBeVisible({
    timeout: 30_000
  });

  await expect(page.getByText("Total hours")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Billable amount")).toBeVisible();
  await expect(page.getByText("Active members")).toBeVisible();
  await expect(page.getByText("Active workspaces")).toBeVisible();
  await expect(page.getByRole("heading", { name: /hours by workspace/i })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /search workspaces/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /filter workspaces/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /sort workspaces/i })).toBeVisible();
});
