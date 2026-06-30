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

  test("updates time settings and shows success toast", async ({ page }) => {
    await page.goto("/settings?section=time");
    const saveButton = page.getByRole("button", { name: "Save Changes" });
    const button24 = page.getByRole("button", { name: "24-hour" });
    const is24Active = !(await button24.evaluate((el) =>
      el.classList.contains("text-muted-foreground")
    ));
    if (is24Active) {
      await page.getByRole("button", { name: "12-hour (AM/PM)" }).click();
    } else {
      await button24.click();
    }
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(page.getByText("Time & date preferences saved successfully.")).toBeVisible();
  });
});
