import { test as setup } from "@playwright/test";
import { loginAsMember } from "./helpers/auth";
import {
  dismissOnboardingIfVisible,
  ensureOnboardingDone,
  markOnboardingDoneInStorage
} from "./helpers/onboarding";

const AUTH_FILE = "e2e/.auth/member.json";

setup("authenticate as member", async ({ page }) => {
  await markOnboardingDoneInStorage(page);
  await loginAsMember(page);
  await dismissOnboardingIfVisible(page);
  await ensureOnboardingDone(page);
  await page.context().storageState({ path: AUTH_FILE });
});
