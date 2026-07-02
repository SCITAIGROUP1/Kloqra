import { test, expect } from "@playwright/test";

test("tenant owner lands on account and can open workspaces page", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: /account overview/i })).toBeVisible({
    timeout: 30_000
  });

  await page.getByRole("link", { name: "Workspaces" }).click();
  await expect(page.getByRole("heading", { name: /^workspaces$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /create workspace/i })).toBeVisible();
});

test("tenant owner can create workspace from account", async ({ page }) => {
  const workspaceName = `E2E Account WS ${Date.now()}`;

  await page.goto("/account/workspaces");
  await page.getByRole("button", { name: /create workspace/i }).click();
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: /^create workspace$/i }).click();

  await expect(page.getByRole("cell", { name: workspaceName })).toBeVisible({ timeout: 15_000 });
});
