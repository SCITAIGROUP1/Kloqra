import { test as setup } from "@playwright/test";
import { loginAsDrew } from "./helpers/auth";

const AUTH_FILE = "e2e/.auth/drew.json";

setup("authenticate as drew", async ({ page }) => {
  await loginAsDrew(page);
  await page.context().storageState({ path: AUTH_FILE });
});
