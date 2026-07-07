import { expect, test, type Page } from "@playwright/test";
import { waitForAdminShell } from "./helpers/shell";

const PENDING_TENANT = {
  id: "00000000-0000-4000-8000-000000000099",
  name: "Provisioned Org",
  slug: "provisioned-org",
  status: "pending_setup",
  settings: {},
  createdAt: new Date().toISOString()
};

const PROVISIONED_OWNER_SESSION = {
  user: { id: "00000000-0000-4000-8000-000000000001", name: "Provisioned Owner" },
  tenantId: PENDING_TENANT.id,
  tenantRole: "OWNER",
  requiresWorkspaceSetup: true
};

const PROVISIONED_OWNER_OVERVIEW = {
  tenant: PENDING_TENANT,
  workspaceCount: 0,
  seatCount: 1,
  subscription: {
    planName: "Trial",
    status: "active",
    billingAlert: null
  }
};

const PROVISIONED_OWNER_ANALYTICS = {
  period: {
    from: new Date().toISOString(),
    to: new Date().toISOString()
  },
  totals: {
    totalHours: 0,
    billableHours: 0,
    billableAmount: 0,
    billablePercent: 0,
    activeMembers: 0,
    activeWorkspaces: 0,
    currency: "USD"
  },
  byWorkspace: []
};

function buildProvisionedOwnerAccessToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: PROVISIONED_OWNER_SESSION.user.id,
      userId: PROVISIONED_OWNER_SESSION.user.id,
      tenantId: PENDING_TENANT.id,
      scope: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600
    })
  ).toString("base64url");
  return `${header}.${payload}.sig`;
}

async function mockProvisionedOwnerSession(page: Page) {
  const accessToken = buildProvisionedOwnerAccessToken();
  const refreshBody = {
    ...PROVISIONED_OWNER_SESSION,
    accessToken
  };

  await page.route("**/auth/refresh", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(refreshBody)
    });
  });
  await page.route("**/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROVISIONED_OWNER_SESSION)
    });
  });
  await page.route("**/tenants/current/overview**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROVISIONED_OWNER_OVERVIEW)
    });
  });
  await page.route("**/tenants/current/analytics**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROVISIONED_OWNER_ANALYTICS)
    });
  });
  await page.addInitScript((token) => {
    for (const key of [
      "cm-admin-access-token",
      "cm-admin-workspace-id",
      "cm-admin-refresh-token"
    ]) {
      localStorage.removeItem(key);
    }
    localStorage.setItem("cm-admin-access-token", token);
  }, accessToken);
}

test("provisioned owner sees organization setup form", async ({ page }) => {
  await page.route("**/tenants/current", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PENDING_TENANT)
    });
  });

  await page.goto("/account/organization");
  await expect(page.getByRole("heading", { name: "Finish setup" })).toBeVisible({
    timeout: 30_000
  });
  await expect(page.getByLabel("Organization name")).toBeVisible();
  await expect(page.getByLabel("Organization ID")).toBeVisible();
});

test("organization page shows recoverable error when profile cannot be loaded", async ({
  page
}) => {
  await page.route("**/tenants/current", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Service unavailable" })
    });
  });

  await page.goto("/account/organization");
  await expect(page.getByText("Unable to load organization profile")).toBeVisible({
    timeout: 30_000
  });
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test.describe("provisioned owner without workspace", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("account overview prompts owner without workspace to create one", async ({ page }) => {
    await mockProvisionedOwnerSession(page);

    await page.goto("/account");
    await waitForAdminShell(page);
    await expect(page.getByRole("heading", { name: "Create your first workspace" })).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByRole("button", { name: "Create workspace" })).toBeVisible();
  });

  test("owner without workspace can open account settings and profile", async ({ page }) => {
    await mockProvisionedOwnerSession(page);

    await page.route("**/users/me", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          email: "owner@example.com",
          name: "Provisioned Owner",
          firstName: "Provisioned",
          lastName: "Owner",
          phone: null,
          location: null,
          jobTitle: null,
          department: null,
          workStartDate: null,
          preferences: { enabled: true },
          effectiveDailyTargetHours: 8,
          effectiveTimerStaleWarningHours: 8,
          effectiveTimezone: "UTC",
          effectiveDateFormat: "MDY",
          effectiveTimeFormat: "12h",
          effectiveTheme: "system",
          twoFactorEnabled: false,
          workContext: {
            organizationName: PENDING_TENANT.name,
            workspaceName: "No workspace yet",
            workspaceRole: "ADMIN"
          },
          activityStats: {
            totalHours: 0,
            projectCount: 0,
            memberSince: new Date().toISOString()
          }
        })
      });
    });

    await page.goto("/account/settings?section=appearance");
    await waitForAdminShell(page);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Could not load settings")).toHaveCount(0);

    await page.goto("/account/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Could not load profile")).toHaveCount(0);
  });

  test("owner without workspace is redirected to required workspace setup", async ({ page }) => {
    await mockProvisionedOwnerSession(page);

    await page.route("**/tenants/current", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...PENDING_TENANT, status: "active" })
      });
    });

    await page.goto("/account/billing");
    await waitForAdminShell(page);
    await expect(page).toHaveURL(/\/account\/workspaces\?setup=required/, { timeout: 15_000 });
    await expect(page.getByRole("dialog", { name: /create your first workspace/i })).toBeVisible();
  });
});
