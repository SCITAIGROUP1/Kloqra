import { test, expect } from "@playwright/test";

test.describe("Settings page", () => {
  test("shows appearance section by default", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Customize how Kloqra looks for you")).toBeVisible();
    await expect(page.getByText("Light", { exact: true })).toBeVisible();
  });

  test("navigates to time settings", async ({ page }) => {
    await page.goto("/settings?section=time");
    await expect(
      page.getByText("Configure your timezone and time display preferences")
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Timezone" })).toBeVisible();
  });
});
