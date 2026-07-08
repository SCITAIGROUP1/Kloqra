import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";
import { clientSidebarProfileLink, waitForProfilePage } from "./helpers/shell";

test.describe("Profile page", () => {
  test("loads profile with personal info tab", async ({ page }) => {
    await page.goto("/dashboard");
    await dismissOnboardingIfVisible(page);
    await clientSidebarProfileLink(page, /Sam Rivera/i).click();
    await expect(page).toHaveURL(/\/profile/, { timeout: 15_000 });
    await waitForProfilePage(page);
    await expect(page.getByRole("heading", { name: "Personal Information" })).toBeVisible();
  });
});
