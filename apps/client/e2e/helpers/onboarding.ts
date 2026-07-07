import { expect, type Page } from "@playwright/test";

const LEGACY_WIZARD_KEY = "kloqra_onboarding_done";
const LEGACY_TOUR_KEY = "kloqra_onboarding_tour_done";

function clearOnboardingKeysInBrowser() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key === LEGACY_WIZARD_KEY ||
      key === LEGACY_TOUR_KEY ||
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
  await page.addInitScript(() => {
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
    for (const key of keysToRemove) localStorage.removeItem(key);

    localStorage.setItem("kloqra_onboarding_done", "true");
    localStorage.setItem("kloqra_onboarding_tour_done", "true");
  });
}

export async function ensureOnboardingDone(page: Page) {
  await page.evaluate(() => {
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
    for (const key of keysToRemove) localStorage.removeItem(key);
    localStorage.setItem("kloqra_onboarding_done", "true");
    localStorage.setItem("kloqra_onboarding_tour_done", "true");
  });
}

export async function clearOnboardingStorage(page: Page) {
  await page.addInitScript(clearOnboardingKeysInBrowser);
  await page.evaluate(clearOnboardingKeysInBrowser);
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
