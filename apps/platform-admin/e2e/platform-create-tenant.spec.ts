import { test, expect } from "@playwright/test";
import { loginPlatformAdmin } from "./helpers/platform-auth";

test("superadmin can open create tenant modal from tenant list", async ({ page }) => {
  await loginPlatformAdmin(page);
  await page.goto("/tenants");
  await page.getByRole("button", { name: "Create tenant" }).click();
  await expect(page.getByRole("dialog", { name: "Create tenant" })).toBeVisible();
  await expect(page.getByLabel("Organization name")).toBeVisible();
  await expect(page.getByLabel("Tenant admin email (optional)")).toBeVisible();
});

test("tenant list shows search, filters, and pagination", async ({ page }) => {
  await loginPlatformAdmin(page);
  await page.goto("/tenants");
  await expect(page.getByRole("textbox", { name: "Search tenants" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Filter by status" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Filter by plan" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Filter by subscription status" })).toBeVisible();
  await expect(page.getByText("Rows per page")).toBeVisible();
});
