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

    await page.getByRole("button", { name: "New project" }).click();
    await page.locator("#name").fill(projectName);
    await page.locator("#client").fill(clientName);
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByRole("row", { name: new RegExp(projectName) })).toBeVisible();
    await expect(page.getByText(clientName).first()).toBeVisible();
  });

  test("opens project overview tab from list", async ({ page }) => {
    // Project list rows link to overview (default project section).
    await page.locator("table tbody tr").first().click();
    await expect(page.getByRole("navigation", { name: "Project sections" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/overview$/);
    await expect(page.getByText("Team time on this project")).toBeVisible();
  });

  test("opens project tasks tab from list", async ({ page }) => {
    await page.locator("table tbody tr").first().click();
    await page.getByRole("link", { name: "Tasks" }).click();
    await expect(page.getByRole("heading", { name: "Tasks", exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/tasks$/);
  });

  test("shows add team member action on project team tab", async ({ page }) => {
    await page.locator("table tbody tr").first().click();
    await page.getByRole("link", { name: "Team" }).click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/team$/);
    await expect(page.getByRole("button", { name: "Add team member" })).toBeVisible();
  });
});
