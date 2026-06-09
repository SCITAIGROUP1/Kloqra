import { test as setup } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

const AUTH_FILE = "e2e/.auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  await loginAsAdmin(page);
  await page.context().storageState({ path: AUTH_FILE });
});
