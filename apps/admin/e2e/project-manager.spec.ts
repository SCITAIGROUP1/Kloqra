import { test, expect, type Page } from "@playwright/test";
import { SEED } from "./constants/seed";
import { clearAdminBrowserSession, completePostLoginSelection, loginAsAdmin } from "./helpers/auth";

const LEAD_EMAIL = SEED.personas.member.email;
const LEAD_PASSWORD = SEED.personas.member.password;

async function loginAsProjectLead(page: Page) {
  await clearAdminBrowserSession(page);
  await page.goto("/login");
  await page.locator("input[type='email']").fill(LEAD_EMAIL);
  const password = page.locator("input[type='password']");
  await password.fill(LEAD_PASSWORD);
  await password.press("Enter");
  await page.waitForURL(/\/(select-context|select-workspace|dashboard|login)(\/|\?|$)/, {
    timeout: 30_000
  });

  await completePostLoginSelection(page);
}

test.describe("Project lead admin access", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await page.goto("/projects");
    await page.getByRole("link", { name: SEED.projects.acme.clientPortalRedesign.name }).click();
    await page.getByRole("link", { name: "Team", exact: true }).click();
    const sageRow = page.getByRole("row").filter({ hasText: LEAD_EMAIL });
    await sageRow.getByRole("combobox", { name: "Project role" }).click();
    await page.getByRole("option", { name: "Project manager" }).click();
    await expect(sageRow.getByText("Project manager")).toBeVisible({ timeout: 10_000 });
    await page.close();
  });

  test("project lead sees filtered nav and approvals page", async ({ page }) => {
    await loginAsProjectLead(page);
    await expect(page).toHaveURL(/dashboard/);

    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Projects" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Approvals" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Team Management" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Exports" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Billing" })).toHaveCount(0);

    await page.getByRole("link", { name: "Approvals" }).click();
    await expect(page).toHaveURL(/approvals/);
    await expect(page.getByRole("heading", { name: /approvals/i })).toBeVisible();
  });
});
