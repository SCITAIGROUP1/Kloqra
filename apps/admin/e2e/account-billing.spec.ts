import { test, expect } from "@playwright/test";

test("tenant owner sees billing page with upgrade options", async ({ page }) => {
  await page.goto("/account/billing");
  await expect(page.getByRole("heading", { name: /^billing and plan$/i })).toBeVisible({
    timeout: 30_000
  });
  await expect(page.getByTestId("billing-plan-card")).toBeVisible();
  await expect(page.getByTestId("billing-upgrade-starter")).toBeVisible();
  await expect(page.getByTestId("billing-upgrade-pro")).toBeVisible();
  await expect(page.getByTestId("billing-interval-toggle")).toBeVisible();
  await expect(page.getByRole("button", { name: /^yearly$/i })).toBeVisible();
});

test("checkout redirect uses mocked API response when stripe billing", async ({ page }) => {
  await page.route("**/tenants/current/subscription", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tenantId: "00000000-0000-4000-8000-000000000099",
          planId: "00000000-0000-4000-8000-000000000001",
          planName: "Pilot",
          status: "active",
          trialEndsAt: null,
          currentPeriodEnd: null,
          limits: { maxWorkspaces: 25, maxSeats: 100, maxReportingApiKeys: 50 },
          stripeCustomerId: null,
          billingAlert: null,
          billingMode: "stripe"
        })
      });
      return;
    }
    await route.continue();
  });

  await page.route("**/tenants/current/subscription/checkout", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_mock" })
    });
  });

  await page.goto("/account/billing");
  await expect(page.getByTestId("billing-upgrade-starter")).toBeVisible({ timeout: 30_000 });

  await Promise.all([
    page.waitForURL("https://checkout.stripe.com/c/pay/cs_test_mock"),
    page.getByTestId("billing-upgrade-starter").click()
  ]);
});

test("simulated billing updates plan without stripe redirect", async ({ page }) => {
  let currentPlanName = "Pilot";

  await page.route("**/tenants/current/subscription**", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tenantId: "00000000-0000-4000-8000-000000000099",
          planId:
            currentPlanName === "Starter"
              ? "00000000-0000-4000-8000-000000000002"
              : "00000000-0000-4000-8000-000000000001",
          planName: currentPlanName,
          status: "active",
          trialEndsAt: null,
          currentPeriodEnd: null,
          limits:
            currentPlanName === "Starter"
              ? { maxWorkspaces: 3, maxSeats: 10, maxReportingApiKeys: 5 }
              : { maxWorkspaces: 25, maxSeats: 100, maxReportingApiKeys: 50 },
          stripeCustomerId: null,
          billingAlert: null,
          billingMode: "simulated"
        })
      });
      return;
    }
    if (method === "PATCH") {
      currentPlanName = "Starter";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tenantId: "00000000-0000-4000-8000-000000000099",
          planId: "00000000-0000-4000-8000-000000000002",
          planName: "Starter",
          status: "active",
          trialEndsAt: null,
          currentPeriodEnd: null,
          limits: { maxWorkspaces: 3, maxSeats: 10, maxReportingApiKeys: 5 },
          stripeCustomerId: null,
          billingAlert: null,
          billingMode: "simulated"
        })
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/account/billing");
  await expect(page.getByTestId("billing-simulated-note")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("billing-upgrade-starter")).toBeVisible();

  await page.getByTestId("billing-upgrade-starter").click();
  await expect(page.getByTestId("billing-plan-card")).toContainText("Starter", { timeout: 15_000 });
});

test("manage subscription button is disabled without stripe customer", async ({ page }) => {
  await page.goto("/account/billing");
  await expect(page.getByTestId("billing-manage-button")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("billing-manage-button")).toBeDisabled();
});

test("contact sales opens dialog and submits inquiry", async ({ page }) => {
  let submitted = false;

  await page.route("**/tenants/current/subscription", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tenantId: "00000000-0000-4000-8000-000000000099",
          planId: "00000000-0000-4000-8000-000000000002",
          planName: "Starter",
          status: "active",
          trialEndsAt: null,
          currentPeriodEnd: null,
          limits: { maxWorkspaces: 3, maxSeats: 10, maxReportingApiKeys: 5 },
          stripeCustomerId: null,
          billingAlert: null,
          billingMode: "stripe"
        })
      });
      return;
    }
    await route.continue();
  });

  await page.route("**/tenants/current/subscription/sales-inquiry**", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: submitted
          ? JSON.stringify({
              id: "inq-test",
              tenantId: "00000000-0000-4000-8000-000000000099",
              planSlug: "pilot",
              planName: "Enterprise",
              status: "open",
              message: null,
              billingInterval: "monthly",
              instructionsSentAt: null,
              createdAt: new Date().toISOString(),
              fulfilledAt: null
            })
          : "null"
      });
      return;
    }
    if (method === "POST") {
      submitted = true;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "inq-test",
          tenantId: "00000000-0000-4000-8000-000000000099",
          planSlug: "pilot",
          planName: "Enterprise",
          status: "open",
          message: null,
          billingInterval: "monthly",
          instructionsSentAt: null,
          createdAt: new Date().toISOString(),
          fulfilledAt: null
        })
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/account/billing");
  await expect(page.getByTestId("billing-contact-sales")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("billing-contact-sales").click();
  await expect(page.getByTestId("contact-sales-dialog")).toBeVisible();
  await page.getByTestId("contact-sales-submit").click();
  await expect(page.getByTestId("sales-inquiry-status")).toBeVisible({ timeout: 15_000 });
});
