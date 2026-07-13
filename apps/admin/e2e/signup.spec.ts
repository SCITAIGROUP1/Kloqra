import { expect, test } from "@playwright/test";

// Signup must start unauthenticated; shared admin storageState redirects away.
test.use({ storageState: { cookies: [], origins: [] } });

test("signup page submits and redirects to verify email", async ({ page }) => {
  await page.route("**/plans/public", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "00000000-0000-4000-8000-000000000002",
            name: "Starter",
            slug: "starter",
            limits: { maxWorkspaces: 3, maxSeats: 10, maxReportingApiKeys: 5 }
          },
          {
            id: "00000000-0000-4000-8000-000000000003",
            name: "Pro",
            slug: "pro",
            limits: { maxWorkspaces: 10, maxSeats: 50, maxReportingApiKeys: 25 }
          }
        ]
      })
    });
  });

  await page.route("**/auth/signup", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ok: true })
    });
  });

  await page.goto("/signup?plan=starter");
  await expect(page.getByRole("heading", { name: "Create your organization" })).toBeVisible();
  await expect(page.getByTestId("signup-plan-starter")).toBeVisible();

  await page.getByLabel("Your name").fill("Signup Owner");
  await page.getByLabel("Work email").fill("signup-ui@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await page.getByLabel("Organization name").fill("UI Test Org");
  await expect(page.getByTestId("signup-org-id-preview")).toContainText("ui-test-org");

  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/verify-email\?email=signup-ui%40example.com/);
});
