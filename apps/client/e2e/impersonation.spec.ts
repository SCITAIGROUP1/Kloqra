import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? "http://localhost:3002";

test("admin impersonation redirects to client dashboard", async ({ page }) => {
  await page.goto(`${ADMIN_BASE_URL}/team-management`);
  await expect(page.getByRole("heading", { name: "Team Management" })).toBeVisible();

  const memberRow = page.getByRole("row", { name: /Sam Rivera/i });
  await memberRow.getByRole("button", { name: /Actions for Sam Rivera/i }).click();
  await page.getByRole("menuitem", { name: "View As Member" }).click();

  await page.waitForURL("**/dashboard**");
  await dismissOnboardingIfVisible(page);
  await expect(page.getByText("Total Hours")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Viewing as/)).toBeVisible({ timeout: 15_000 });

  const workspaceSwitcher = page.locator("button[aria-haspopup='listbox']").first();
  await expect(workspaceSwitcher).toBeVisible();
  const currentWorkspace = (await workspaceSwitcher.textContent()) ?? "";
  const targetWorkspace = currentWorkspace.includes("Meridian")
    ? "Acme Corporation"
    : "Meridian Product Co";

  await workspaceSwitcher.click();
  await page.getByRole("listbox").getByRole("option", { name: targetWorkspace }).click();

  await page.waitForURL("**/dashboard**");
  await expect(page.getByText("Total Hours")).toBeVisible();
  await expect(page.getByText(/Viewing as/)).toBeVisible({ timeout: 15_000 });
});
