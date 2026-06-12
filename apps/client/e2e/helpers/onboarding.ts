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

export async function dismissOnboardingIfVisible(page: Page) {
  const welcome = page.getByRole("heading", { level: 1, name: /Welcome to Kloqra/i });
  if (!(await welcome.isVisible({ timeout: 1_000 }).catch(() => false))) {
    await ensureOnboardingDone(page);
    return;
  }

  const returnPath = currentPath(page);
  await ensureOnboardingDone(page);
  await page.reload();
  if (!(await welcome.isVisible({ timeout: 1_000 }).catch(() => false))) {
    return;
  }

  const dialog = page.getByRole("dialog").filter({ hasText: "Getting Started" });
  await dialog.getByRole("button", { name: "Skip onboarding" }).click();
  await expect(welcome).not.toBeVisible({ timeout: 10_000 });

  if (currentPath(page) !== returnPath) {
    await page.goto(returnPath);
  }
}
