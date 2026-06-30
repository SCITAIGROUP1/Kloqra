import { test, expect, type Page } from "@playwright/test";

async function gotoDashboard(page: Page, options?: { expectWizard?: boolean }) {
  await page.goto("/dashboard");
  await page.waitForLoadState("domcontentloaded");

  if (options?.expectWizard) {
    await expect(welcomeHeading(page)).toBeVisible({ timeout: 15_000 });
    return;
  }

  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible({
    timeout: 15_000
  });
}

function welcomeHeading(page: Page) {
  return page.getByRole("heading", { level: 1, name: /Welcome to Kloqra/i });
}

function wizardDialog(page: Page) {
  return page.getByRole("dialog").filter({ hasText: "Getting Started" });
}

function wizardStepTitle(page: Page, pattern: RegExp | string) {
  return wizardDialog(page).locator("h2.text-xl").filter({ hasText: pattern });
}

async function clickWizardNext(page: Page) {
  await wizardDialog(page).getByRole("button", { name: "Next", exact: true }).click();
}

test.describe("Onboarding first visit", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("kloqra_onboarding_done");
      localStorage.removeItem("kloqra_onboarding_tour_done");
    });
    await gotoDashboard(page, { expectWizard: true });
  });

  test("shows welcome wizard on first visit", async ({ page }) => {
    await expect(welcomeHeading(page)).toBeVisible();
    await expect(page.getByText("Step 1 of 5")).toBeVisible();
  });

  test("advances through wizard steps with Next", async ({ page }) => {
    await clickWizardNext(page);
    await expect(page.getByText("Step 2 of 5")).toBeVisible();
    await expect(wizardStepTitle(page, /assigned projects/i)).toBeVisible();

    await clickWizardNext(page);
    await expect(page.getByText("Step 3 of 5")).toBeVisible();
    await expect(wizardStepTitle(page, /Three ways to track time/i)).toBeVisible();

    await clickWizardNext(page);
    await expect(page.getByText("Step 4 of 5")).toBeVisible();
    await expect(wizardStepTitle(page, /Projects & dashboard/i)).toBeVisible();

    await clickWizardNext(page);
    await expect(page.getByText("Step 5 of 5")).toBeVisible();
    await expect(wizardStepTitle(page, /almost ready/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Take the quick tour" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Go to Timer" })).toBeVisible();
  });

  test("starts spotlight tour from finish step", async ({ page }) => {
    for (let i = 0; i < 4; i += 1) {
      await clickWizardNext(page);
    }
    await page.getByRole("button", { name: "Take the quick tour" }).click();
    await expect(page.getByRole("dialog", { name: /navigation hub/i })).toBeVisible();
    await expect(page.getByText("Tour · 1 of 6")).toBeVisible();
  });
});

test.describe("Onboarding persistence", () => {
  test("skips onboarding and does not show wizard again after reload", async ({ page }) => {
    await gotoDashboard(page);
    if (!(await welcomeHeading(page).isVisible())) {
      await page.evaluate(() => {
        localStorage.removeItem("kloqra_onboarding_done");
        localStorage.removeItem("kloqra_onboarding_tour_done");
      });
      await page.reload();
      await expect(welcomeHeading(page)).toBeVisible({ timeout: 15_000 });
    }
    await expect(welcomeHeading(page)).toBeVisible();
    await wizardDialog(page).getByRole("button", { name: "Skip onboarding" }).click();
    await expect(welcomeHeading(page)).not.toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(welcomeHeading(page)).not.toBeVisible();
  });
});

test.describe("Onboarding replay", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kloqra_onboarding_done", "true");
    });
    await gotoDashboard(page);
  });

  test("sparkles menu offers setup guide and product tour", async ({ page }) => {
    await page.getByRole("button", { name: "Help menu" }).click();
    await expect(page.getByRole("button", { name: "Full setup guide" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Quick product tour" })).toBeVisible();
  });

  test("opens wizard replay from sparkles menu", async ({ page }) => {
    await page.getByRole("button", { name: "Help menu" }).click();
    await page.getByRole("button", { name: "Full setup guide" }).click();
    await expect(welcomeHeading(page)).toBeVisible();
  });

  test("opens tour only from sparkles menu", async ({ page }) => {
    await page.getByRole("button", { name: "Help menu" }).click();
    await page.getByRole("button", { name: "Quick product tour" }).click();
    await expect(page.getByRole("dialog", { name: /navigation hub/i })).toBeVisible();
  });
});
