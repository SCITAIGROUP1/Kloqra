import { test, expect } from "@playwright/test";

test.describe("Profile page", () => {
  test("loads profile with personal info tab", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Personal Information" })).toBeVisible();
  });
});
