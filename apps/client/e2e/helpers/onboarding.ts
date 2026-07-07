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
      if (!token) return false;
      const res = await fetch(`${apiBase}/users/me/preferences`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Auth-Scope": "client",
          ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {})
        },
        body: JSON.stringify(prefs)
      });
      return res.ok;
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

function onboardingDialog(page: Page) {
  return page.getByRole("dialog").filter({ hasText: "Getting Started" });
}

/** Wait until client shell finished bootstrapping (not login/loading). */
export async function waitForClientShell(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.getByText("Loading workspace…")).toBeHidden({ timeout: 30_000 });
}

export async function dismissOnboardingIfVisible(page: Page) {
  await waitForClientShell(page);
  await markOnboardingDoneInStorage(page);

  const dialog = onboardingDialog(page);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!(await dialog.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return;
    }
    await dialog.getByRole("button", { name: "Skip onboarding" }).click({ timeout: 10_000 });
    if (await dialog.isHidden({ timeout: 10_000 }).catch(() => false)) {
      return;
    }
    await markOnboardingDoneInStorage(page);
  }

  await expect(dialog).toBeHidden({ timeout: 10_000 });
}
