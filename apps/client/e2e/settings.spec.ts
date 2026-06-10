import { test, expect } from "@playwright/test";

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "member@kloqra.dev");
    await page.fill("#password", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/timer");
  });

  test("shows appearance section by default", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Customize how Kloqra looks for you")).toBeVisible();
    await expect(page.getByText("Light")).toBeVisible();
  });

  test("navigates to time settings", async ({ page }) => {
    await page.goto("/settings?section=time");
    await expect(
      page.getByText("Configure your timezone and time display preferences")
    ).toBeVisible();
    await expect(page.getByText("Timezone")).toBeVisible();
  });
});
