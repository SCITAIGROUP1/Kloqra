import { expect, test } from "@playwright/test";

test.describe("Compliance legal footer", () => {
  test("login page shows legal links when env URLs are set", async ({ page }) => {
    await page.goto("/login");
    const terms = page.getByRole("link", { name: "Terms" });
    const privacy = page.getByRole("link", { name: "Privacy" });
    if (process.env.NEXT_PUBLIC_LEGAL_TOS_URL) {
      await expect(terms).toBeVisible();
    }
    if (process.env.NEXT_PUBLIC_LEGAL_PRIVACY_URL) {
      await expect(privacy).toBeVisible();
    }
  });
});
