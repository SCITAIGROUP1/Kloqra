import { test, expect } from "@playwright/test";
import { SEED } from "./constants/seed";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? "http://localhost:3002";
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL ?? "http://localhost:3000";

function clientDashboardUrl() {
  return `${CLIENT_BASE_URL}/dashboard**`;
}

test("admin impersonation redirects to client dashboard", async ({ page }) => {
  await page.goto(`${ADMIN_BASE_URL}/team-management`);
  await expect(page.getByRole("heading", { name: "Team Management" })).toBeVisible();

  const memberName = SEED.personas.member.name;
  const memberRow = page.getByRole("row", { name: new RegExp(memberName, "i") });
  await memberRow
    .getByRole("button", { name: new RegExp(`Actions for ${memberName}`, "i") })
    .click();
  await page.getByRole("menuitem", { name: "View As Member" }).click();

  await page.waitForURL(clientDashboardUrl());
  await dismissOnboardingIfVisible(page);
  await expect(page.getByTestId("impersonation-banner")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("impersonation-banner")).toContainText(/Viewing as/);
  await expect(page.getByRole("heading", { name: "Total Hours (Today)" })).toBeVisible({
    timeout: 15_000
  });

  const workspaceSwitcher = page.locator("button[aria-haspopup='listbox']").first();
  await expect(workspaceSwitcher).toBeVisible();
  const currentWorkspace = (await workspaceSwitcher.textContent()) ?? "";
  const targetWorkspace = currentWorkspace.includes(SEED.workspaces.meridian.name.split(" ")[0])
    ? SEED.workspaces.acme.name
    : SEED.workspaces.meridian.name;

  await workspaceSwitcher.click();
  await page.getByRole("listbox").getByRole("option", { name: targetWorkspace }).click();

  await page.waitForURL(clientDashboardUrl());
  await expect(page.getByTestId("impersonation-banner")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Total Hours (Today)" })).toBeVisible();
});
