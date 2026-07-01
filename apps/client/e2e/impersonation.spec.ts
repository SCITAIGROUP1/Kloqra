import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";

test("admin impersonation redirects to client dashboard", async ({ page }) => {
  await page.goto(`${process.env.ADMIN_BASE_URL ?? "http://localhost:3002"}/team-management`);
  await expect(page.getByRole("heading", { name: "Team Management" })).toBeVisible();

  const memberRow = page.getByRole("row", { name: /Member User/i });
  await memberRow.getByRole("button", { name: /Actions for Member User/i }).click();
  await page.getByRole("menuitem", { name: "View As Member" }).click();

  const clientDashboardUrl = `${process.env.CLIENT_BASE_URL ?? "http://localhost:3000"}/dashboard**`;
  await page.waitForURL(clientDashboardUrl);
  await dismissOnboardingIfVisible(page);
  await expect(page.getByText(/Viewing as/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Total Hours (Today)" })).toBeVisible({
    timeout: 15_000
  });

  const workspaceSwitcher = page.locator("button[aria-haspopup='listbox']").first();
  await expect(workspaceSwitcher).toBeVisible();
  await expect(workspaceSwitcher).toContainText("Softcodeit");
});
