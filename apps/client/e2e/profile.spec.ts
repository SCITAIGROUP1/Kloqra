import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";

test.describe("Profile page", () => {
  test("loads profile with personal info tab", async ({ page }) => {
    await page.goto("/profile");
    await dismissOnboardingIfVisible(page);
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Personal Information" })).toBeVisible();
  });
});
