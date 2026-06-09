import { test, expect } from "@playwright/test";

test.describe("Admin projects", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  });

  test("lists seeded workspace projects", async ({ page }) => {
    await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test("creates a project with name and client", async ({ page }) => {
    const projectName = `E2E Project ${Date.now()}`;
    const clientName = "Acme Corp";

    await page.locator("#name").fill(projectName);
    await page.locator("#client").fill(clientName);
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByRole("row", { name: new RegExp(projectName) })).toBeVisible();
    await expect(page.getByText(clientName).first()).toBeVisible();
  });
});
