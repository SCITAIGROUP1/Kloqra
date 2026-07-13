import { expect, test, type Page, type Route } from "@playwright/test";
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

const PROVISIONED_OWNER_SUBSCRIPTION = {
  tenantId: PENDING_TENANT.id,
  planId: "00000000-0000-4000-8000-000000000010",
  planName: "Trial",
  status: "active",
  trialEndsAt: null,
  currentPeriodEnd: null,
  limits: { maxWorkspaces: 25, maxSeats: 100, maxReportingApiKeys: 50 },
  stripeCustomerId: null,
  billingAlert: null,
  billingMode: "simulated"
};

const PROVISIONED_OWNER_OVERVIEW = {
  tenant: PENDING_TENANT,
  workspaceCount: 0,
  seatCount: 1,
  subscription: PROVISIONED_OWNER_SUBSCRIPTION
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

const PROVISIONED_OWNER_USER_PROFILE = {
  email: "owner@example.com",
  name: "Provisioned Owner",
  firstName: "Provisioned",
  lastName: "Owner",
  phone: null,
  location: null,
  jobTitle: null,
  department: null,
  workStartDate: null,
  preferences: { enabled: true, theme: "system" },
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

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function mockProvisionedOwnerSession(page: Page) {
  const accessToken = buildProvisionedOwnerAccessToken();
  const refreshBody = {
    ...PROVISIONED_OWNER_SESSION,
    accessToken
  };

  await page.route(/localhost:3001\/.*/, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === "/auth/refresh" && method === "POST") {
      await fulfillJson(route, refreshBody);
      return;
    }
    if (path === "/auth/me") {
      await fulfillJson(route, PROVISIONED_OWNER_SESSION);
      return;
    }
    if (path === "/users/me" && method === "GET") {
      await fulfillJson(route, PROVISIONED_OWNER_USER_PROFILE);
      return;
    }
    if (path === "/users/me" && method === "PATCH") {
      await fulfillJson(route, PROVISIONED_OWNER_USER_PROFILE);
      return;
    }
    if (path === "/users/me/preferences" && method === "PATCH") {
      await fulfillJson(route, PROVISIONED_OWNER_USER_PROFILE);
      return;
    }
    if (path === "/tenants/current" && method === "GET") {
      await fulfillJson(route, PENDING_TENANT);
      return;
    }
    if (path.startsWith("/tenants/current/overview")) {
      await fulfillJson(route, PROVISIONED_OWNER_OVERVIEW);
      return;
    }
    if (path.startsWith("/tenants/current/analytics")) {
      await fulfillJson(route, PROVISIONED_OWNER_ANALYTICS);
      return;
    }
    if (path.startsWith("/tenants/current/subscription")) {
      await fulfillJson(route, PROVISIONED_OWNER_SUBSCRIPTION);
      return;
    }
    if (path.startsWith("/tenants/current/workspace-admins")) {
      await fulfillJson(route, { items: [], total: 0, page: 1, limit: 25 });
      return;
    }
    if (path === "/workspaces" && method === "GET") {
      await fulfillJson(route, []);
      return;
    }

    await fulfillJson(route, {});
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

test.describe("organization setup with mocked tenant profile", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("provisioned owner sees organization setup form", async ({ page }) => {
    await mockProvisionedOwnerSession(page);

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
    await mockProvisionedOwnerSession(page);
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
});

test.describe("provisioned owner without workspace", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("account overview prompts owner without workspace to create one", async ({ page }) => {
    await mockProvisionedOwnerSession(page);

    await page.goto("/account");
    await waitForAdminShell(page);
    await expect(page).toHaveURL(/\/account\/workspaces\?setup=required/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Create your first workspace" })).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByRole("button", { name: "Create workspace" })).toBeVisible();
  });

  test("owner without workspace can open account settings and profile", async ({ page }) => {
    await mockProvisionedOwnerSession(page);

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

    await page.route(/localhost:3001\/tenants\/current$/, async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await fulfillJson(route, { ...PENDING_TENANT, status: "active" });
    });

    await page.goto("/account/billing");
    await waitForAdminShell(page);
    await expect(page).toHaveURL(/\/account\/workspaces\?setup=required/, { timeout: 15_000 });
    await expect(page.getByRole("dialog", { name: /create your first workspace/i })).toBeVisible();
  });

  test("authenticated owner visiting login is redirected to onboarding", async ({ page }) => {
    await mockProvisionedOwnerSession(page);

    await page.goto("/login");
    await expect(page).toHaveURL(/\/account\/organization/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Admin sign in" })).toHaveCount(0);
    await expect(page.getByLabel("Email")).toHaveCount(0);
    await waitForAdminShell(page);
    await expect(page.getByRole("heading", { name: "Finish setup" })).toBeVisible({
      timeout: 30_000
    });
  });

  test("login submit routes provisioned owner to onboarding without returning to login", async ({
    page
  }) => {
    const accessToken = buildProvisionedOwnerAccessToken();
    const loginBody = {
      ...PROVISIONED_OWNER_SESSION,
      accessToken
    };

    await page.route(/localhost:3001\/.*/, async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      const method = route.request().method();

      if (path === "/auth/login" && method === "POST") {
        await fulfillJson(route, loginBody);
        return;
      }
      // Do not mint a session via refresh before the user submits the form.
      if (path === "/auth/refresh" && method === "POST") {
        await fulfillJson(route, { message: "Unauthorized" }, 401);
        return;
      }
      if (path === "/auth/me") {
        await fulfillJson(route, PROVISIONED_OWNER_SESSION);
        return;
      }
      if (path === "/users/me") {
        await fulfillJson(route, PROVISIONED_OWNER_USER_PROFILE);
        return;
      }
      if (path === "/tenants/current" && method === "GET") {
        await fulfillJson(route, PENDING_TENANT);
        return;
      }
      if (path.startsWith("/tenants/current/")) {
        if (path.startsWith("/tenants/current/overview")) {
          await fulfillJson(route, PROVISIONED_OWNER_OVERVIEW);
          return;
        }
        if (path.startsWith("/tenants/current/subscription")) {
          await fulfillJson(route, PROVISIONED_OWNER_SUBSCRIPTION);
          return;
        }
        await fulfillJson(route, {});
        return;
      }
      if (path === "/workspaces" && method === "GET") {
        await fulfillJson(route, []);
        return;
      }
      await fulfillJson(route, {});
    });

    await page.addInitScript(() => {
      for (const key of [
        "cm-admin-access-token",
        "cm-admin-workspace-id",
        "cm-admin-refresh-token"
      ]) {
        localStorage.removeItem(key);
      }
    });

    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Email").fill("owner@example.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/account\/organization/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Admin sign in" })).toHaveCount(0);
    await waitForAdminShell(page);
    await expect(page.getByRole("heading", { name: "Finish setup" })).toBeVisible({
      timeout: 30_000
    });
  });
});
