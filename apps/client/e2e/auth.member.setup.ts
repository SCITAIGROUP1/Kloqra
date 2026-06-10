import { test as setup } from "@playwright/test";
import { loginAsMember } from "./helpers/auth";

const AUTH_FILE = "e2e/.auth/member.json";

setup("authenticate as member", async ({ page }) => {
  await loginAsMember(page);
  await page.context().storageState({ path: AUTH_FILE });
});
