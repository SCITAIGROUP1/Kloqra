import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Admin global search", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
  });

  test("does not show a toolbar search field", async ({ page }) => {
    await expect(page.getByTestId("global-search-open")).toHaveCount(0);
  });

  test("opens command palette with keyboard shortcut", async ({ page }) => {
    await page.keyboard.press("ControlOrMeta+KeyK");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Pages")).toBeVisible();
    await expect(page.getByRole("option", { name: "Projects" })).toBeVisible();
  });

  test("finds seeded projects and navigates on select", async ({ page }) => {
    await page.keyboard.press("ControlOrMeta+KeyK");
    const input = page.getByRole("combobox", { name: "Search admin" });
    await input.fill("Annual Audit");
    await expect(page.getByRole("option", { name: "Annual Audit" })).toBeVisible({
      timeout: 15_000
    });
    await page.getByRole("option", { name: "Annual Audit" }).click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/overview$/);
    await expect(page.getByText("Annual Audit")).toBeVisible();
  });

  test("navigates to approvals page from pages group", async ({ page }) => {
    await page.keyboard.press("ControlOrMeta+KeyK");
    await page.getByRole("option", { name: "Approvals" }).click();
    await expect(page).toHaveURL(/\/approvals$/);
    await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible();
  });
});
