import { test, expect } from "@playwright/test";

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? "http://localhost:3002";

test("admin impersonation redirects to client dashboard", async ({ page }) => {
  await page.goto(`${ADMIN_BASE_URL}/login`);
  await page.fill("input[type='email']", "admin@kloqra.dev");
  await page.fill("input[type='password']", "password123");
  await page.click("button[type='submit']");

  await page.waitForURL("**/dashboard");
  await page.goto(`${ADMIN_BASE_URL}/workspace`);
  await page.waitForURL("**/workspace");
  await page.waitForSelector("text=Members (");

  const memberRow = page.getByRole("row", { name: /Sam Rivera/i });
  await memberRow.getByRole("button", { name: "View as member" }).click();

  await page.waitForURL("**/dashboard**");
  await expect(page.getByText("Total Hours")).toBeVisible();
  await expect(page.getByText(/Viewing workspace as/)).toBeVisible({ timeout: 15_000 });

  const workspaceSwitcher = page.getByRole("combobox").first();
  await expect(workspaceSwitcher).toBeVisible();
  const currentWorkspace = (await workspaceSwitcher.textContent()) ?? "";
  const targetWorkspace = currentWorkspace.includes("Meridian")
    ? "Acme Corporation"
    : "Meridian Product Co";

  await workspaceSwitcher.click();
  await page.getByRole("option", { name: targetWorkspace }).click();

  await page.waitForURL("**/dashboard**");
  await expect(page.getByText("Total Hours")).toBeVisible();
  await expect(page.getByText(/Viewing workspace as/)).toBeVisible({ timeout: 15_000 });
});
