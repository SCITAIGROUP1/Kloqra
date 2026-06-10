import { test, expect } from "@playwright/test";

test.describe("Profile page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "member@kloqra.dev");
    await page.fill("#password", "password123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/timer");
  });

  test("loads profile with personal info tab", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByText("Personal Information")).toBeVisible();
  });
});
