import { test as setup } from "@playwright/test";
import { loginAsDrew } from "./helpers/auth";
import {
  dismissOnboardingIfVisible,
  ensureOnboardingDone,
  markOnboardingDoneInStorage
} from "./helpers/onboarding";

const AUTH_FILE = "e2e/.auth/drew.json";

setup("authenticate as drew", async ({ page }) => {
  await markOnboardingDoneInStorage(page);
  await loginAsDrew(page);
  await dismissOnboardingIfVisible(page);
  await ensureOnboardingDone(page);
  await page.context().storageState({ path: AUTH_FILE });
});
