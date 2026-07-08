import { test, expect, type Page } from "@playwright/test";
import { SEED } from "./constants/seed";
import { loginAsDrew, loginAsMember, logoutFromClient } from "./helpers/auth";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";
import {
  clientSidebarProfileLink,
  expectWorkspaceSwitcherShows,
  waitForProfilePage
} from "./helpers/shell";

function sidebarProfileLink(page: Page, name: string) {
  return clientSidebarProfileLink(page, new RegExp(name, "i"));
}

test.describe("Session boundary", () => {
  test("logout clears member session before Drew login", async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/dashboard");
    await dismissOnboardingIfVisible(page);

    await expect(sidebarProfileLink(page, SEED.personas.member.name)).toBeVisible();
    await sidebarProfileLink(page, SEED.personas.member.name).click();
    await waitForProfilePage(page);
    await expect(page.locator("#email")).toHaveValue(SEED.personas.member.email);

    await logoutFromClient(page);

    await loginAsDrew(page);
    await page.goto("/dashboard");
    await dismissOnboardingIfVisible(page);

    await expect(sidebarProfileLink(page, SEED.personas.drew.name)).toBeVisible();
    await expect(sidebarProfileLink(page, SEED.personas.member.name)).toHaveCount(0);

    await sidebarProfileLink(page, SEED.personas.drew.name).click();
    await waitForProfilePage(page);
    await expect(page.locator("#email")).toHaveValue(SEED.personas.drew.email);
    await expect(page.locator("#email")).not.toHaveValue(SEED.personas.member.email);
  });

  test("workspace switch does not show data from the previous workspace", async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/dashboard");
    await dismissOnboardingIfVisible(page);

    const workspaceSwitcher = page.locator("button[aria-haspopup='listbox']").first();
    await expect(workspaceSwitcher).toBeVisible();
    const currentLabel = (await workspaceSwitcher.getAttribute("aria-label")) ?? "";
    const targetWorkspace = currentLabel.includes(SEED.workspaces.meridian.name)
      ? SEED.workspaces.acme.name
      : SEED.workspaces.meridian.name;

    await workspaceSwitcher.click();
    await page.getByRole("listbox").getByRole("option", { name: targetWorkspace }).click();
    await page.waitForURL(/\/(dashboard|timer|timesheet|time-tracker)/, { timeout: 30_000 });
    await dismissOnboardingIfVisible(page);

    await expectWorkspaceSwitcherShows(page, targetWorkspace);
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  });

  test("bfcache back navigation does not resurrect the previous account profile", async ({
    page
  }) => {
    await loginAsMember(page);
    await page.goto("/dashboard");
    await dismissOnboardingIfVisible(page);
    await sidebarProfileLink(page, SEED.personas.member.name).click();
    await waitForProfilePage(page);
    await dismissOnboardingIfVisible(page);
    await expect(page.locator("#email")).toHaveValue(SEED.personas.member.email);

    await logoutFromClient(page);
    await loginAsDrew(page);
    await page.goto("/dashboard");
    await dismissOnboardingIfVisible(page);
    await sidebarProfileLink(page, SEED.personas.drew.name).click();
    await waitForProfilePage(page);
    await dismissOnboardingIfVisible(page);
    await expect(page.locator("#email")).toHaveValue(SEED.personas.drew.email);

    await page.goBack();
    await page.waitForLoadState("domcontentloaded");

    if (page.url().includes("/login")) {
      await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
      return;
    }

    if (page.url().includes("/profile")) {
      await waitForProfilePage(page);
      await expect(page.locator("#email")).toHaveValue(SEED.personas.drew.email);
      await expect(page.locator("#email")).not.toHaveValue(SEED.personas.member.email);
      return;
    }

    // bfcache may restore dashboard shell instead of the prior profile route.
    await expect(sidebarProfileLink(page, SEED.personas.drew.name)).toBeVisible();
    await expect(sidebarProfileLink(page, SEED.personas.member.name)).toHaveCount(0);
  });
});
