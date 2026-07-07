import { expect, type Page } from "@playwright/test";

const API_BASE = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3001";

async function patchOnboardingPreferences(
  page: Page,
  preferences: { onboardingWizardDone: boolean; onboardingTourDone: boolean }
) {
  await page.evaluate(
    async ({ apiBase, prefs }) => {
      const token = localStorage.getItem("cm-client-access-token");
      const workspaceId = localStorage.getItem("cm-client-workspace-id");
      if (!token) return;
      await fetch(`${apiBase}/users/me/preferences`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Auth-Scope": "client",
          ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {})
        },
        body: JSON.stringify(prefs)
      });
    },
    { apiBase: API_BASE, prefs: preferences }
  );
}

function clearLegacyOnboardingKeysInBrowser() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key === "kloqra_onboarding_done" ||
      key === "kloqra_onboarding_tour_done" ||
      key.endsWith(":onboarding_done") ||
      key.endsWith(":onboarding_tour_done")
    ) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

export async function markOnboardingDoneInStorage(page: Page) {
  if (!page.url().includes("localhost")) {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
  }
  await page.evaluate(clearLegacyOnboardingKeysInBrowser);
  await patchOnboardingPreferences(page, {
    onboardingWizardDone: true,
    onboardingTourDone: true
  });
}

export async function ensureOnboardingDone(page: Page) {
  await markOnboardingDoneInStorage(page);
}

/** Reset onboarding flags in the database for the signed-in user (e2e). */
export async function clearOnboardingStorage(page: Page) {
  if (!page.url().includes("localhost")) {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
  }
  await page.evaluate(clearLegacyOnboardingKeysInBrowser);
  await patchOnboardingPreferences(page, {
    onboardingWizardDone: false,
    onboardingTourDone: false
  });
}

function currentPath(page: Page) {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}`;
}

function onboardingDialog(page: Page) {
  return page.getByRole("dialog").filter({ hasText: "Getting Started" });
}

export async function dismissOnboardingIfVisible(page: Page) {
  await ensureOnboardingDone(page);

  const dialog = onboardingDialog(page);
  if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await dialog.getByRole("button", { name: "Skip onboarding" }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
    return;
  }

  const returnPath = currentPath(page);
  await page.reload();
  await page.waitForLoadState("domcontentloaded");

  if (await dialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await dialog.getByRole("button", { name: "Skip onboarding" }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
  }

  if (currentPath(page) !== returnPath) {
    await page.goto(returnPath);
  }
}
