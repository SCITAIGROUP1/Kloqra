import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";
import { clickSettingsNavSection, openClientSettings, waitForSettingsPage } from "./helpers/shell";

test.describe("Settings page", () => {
  test("shows appearance section by default", async ({ page }) => {
    await page.goto("/dashboard");
    await dismissOnboardingIfVisible(page);
    await openClientSettings(page);
    await expect(page).toHaveURL(/\/settings/, { timeout: 15_000 });
    await waitForSettingsPage(page);
    await expect(page.getByText("Customize how Kloqra looks for you")).toBeVisible();
    await expect(page.getByText("Light", { exact: true })).toBeVisible();
  });

  test("navigates to time settings", async ({ page }) => {
    await page.goto("/dashboard");
    await dismissOnboardingIfVisible(page);
    await openClientSettings(page);
    await waitForSettingsPage(page);
    await clickSettingsNavSection(page, "Time Settings");
    await expect(page).toHaveURL(/section=time/, { timeout: 15_000 });
    await expect(
      page.getByText("Configure your timezone and time display preferences")
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Timezone" })).toBeVisible();
  });

  test("updates time settings and shows success toast", async ({ page }) => {
    await page.goto("/dashboard");
    await dismissOnboardingIfVisible(page);
    await openClientSettings(page);
    await waitForSettingsPage(page);
    await clickSettingsNavSection(page, "Time Settings");
    await expect(page).toHaveURL(/section=time/, { timeout: 15_000 });
    const timezone = page.getByRole("combobox", { name: /timezone/i });
    const currentTz = (await timezone.textContent())?.trim() ?? "";
    await timezone.click();
    const options = page.getByRole("option");
    const optionCount = await options.count();
    for (let i = 0; i < optionCount; i += 1) {
      const label = ((await options.nth(i).textContent()) ?? "").trim();
      if (label && label !== currentTz) {
        await options.nth(i).click();
        break;
      }
    }
    const saveButton = page.getByRole("main").getByRole("button", { name: "Save Changes" }).first();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(page.getByText("Time & date preferences saved successfully.")).toBeVisible();
  });
});
