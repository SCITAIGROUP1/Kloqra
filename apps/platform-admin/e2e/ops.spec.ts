import { expect, test } from "@playwright/test";
import { loginPlatformAdmin } from "./helpers/platform-auth";

const OPS_SUMMARY = {
  tenants: {
    active: 2,
    trial: 1,
    suspended: 0,
    churned: 0,
    pendingSetup: 1
  },
  subscriptions: {
    active: 2,
    trial: 1,
    pastDue: 0,
    canceled: 0
  },
  usage: {
    totalWorkspaces: 3,
    totalSeats: 12
  },
  queues: {
    "mail-queue": { waiting: 0, active: 0, failed: 1, delayed: 0 },
    "bulk-invite-queue": { waiting: 0, active: 0, failed: 0, delayed: 0 },
    "bulk-category-queue": { waiting: 0, active: 0, failed: 0, delayed: 0 },
    "export-queue": { waiting: 0, active: 0, failed: 0, delayed: 0 }
  },
  mrr: { currency: "usd", amountCents: 9900, source: "stripe" },
  reconcile: {
    driftCount: 0,
    lastCheckedAt: "2026-06-24T12:00:00.000Z"
  }
};

test("platform ops dashboard shows fleet metrics", async ({ page }) => {
  await page.route("**/platform/ops/summary", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(OPS_SUMMARY)
    });
  });

  await loginPlatformAdmin(page);
  await expect(page).toHaveURL(/\/tenants/, { timeout: 30_000 });

  await page.getByRole("link", { name: "Ops" }).click();
  await expect(page).toHaveURL(/\/ops/);
  await expect(page.getByRole("heading", { name: "Ops" })).toBeVisible();
  await expect(page.getByText("Active tenants")).toBeVisible();
  await expect(page.getByText("$99")).toBeVisible();
  await expect(page.getByTestId("ops-queue-mail-queue")).toBeVisible();
});
