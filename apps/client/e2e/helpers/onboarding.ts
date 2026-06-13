import { expect, type Page } from "@playwright/test";

const WIZARD_DONE_KEY = "kloqra_onboarding_done";
const TOUR_DONE_KEY = "kloqra_onboarding_tour_done";

export async function markOnboardingDoneInStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("kloqra_onboarding_done", "true");
    localStorage.setItem("kloqra_onboarding_tour_done", "true");
  });
}

export async function ensureOnboardingDone(page: Page) {
  await page.evaluate(
    ([wizardKey, tourKey]) => {
      localStorage.setItem(wizardKey, "true");
      localStorage.setItem(tourKey, "true");
    },
    [WIZARD_DONE_KEY, TOUR_DONE_KEY] as const
  );
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
