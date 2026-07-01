import { test, expect } from "@playwright/test";

test.describe("Admin projects", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  });

  test("lists workspace projects after creating one", async ({ page }) => {
    const projectName = `E2E Listed Project ${Date.now()}`;
    const clientName = "Listed Client";

    await page.getByRole("button", { name: "New project" }).click();
    await page.locator("#name").fill(projectName);
    await page.locator("#client").fill(clientName);
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByRole("link", { name: `Open ${projectName}` })).toBeVisible({
      timeout: 15_000
    });

    await expect(page.getByRole("columnheader", { name: "Project Name" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Client Name" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Total Time Tracked" })).toBeVisible();
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test("shows status filter with all, active, and inactive options", async ({ page }) => {
    const statusFilter = page.getByRole("combobox", { name: "Filter by status" });
    await expect(statusFilter).toBeVisible();
    await expect(statusFilter).toHaveText("All statuses");

    await statusFilter.click();
    await expect(page.getByRole("option", { name: "Active", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: "Inactive", exact: true })).toBeVisible();
    await page.getByRole("option", { name: "Active", exact: true }).click();
    await expect(statusFilter).toHaveText("Active");
  });

  test("filters projects from the app bar search", async ({ page }) => {
    await page.getByRole("textbox", { name: "Search projects" }).fill("zzzz-no-project-xyz");
    await expect(page.getByText("No matching projects")).toBeVisible();
  });

  test("creates a project with name and client", async ({ page }) => {
    const projectName = `E2E Project ${Date.now()}`;
    const clientName = "Example Client";

    await page.getByRole("button", { name: "New project" }).click();
    await page.locator("#name").fill(projectName);
    await page.locator("#client").fill(clientName);
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByRole("link", { name: `Open ${projectName}` })).toBeVisible({
      timeout: 15_000
    });
    const projectRow = page.getByRole("link", { name: `Open ${projectName}` });
    await expect(projectRow.getByText(clientName, { exact: true })).toBeVisible();
  });

  test("shows duplicate project name error in create modal", async ({ page }) => {
    const existingName = `E2E Duplicate ${Date.now()}`;

    await page.getByRole("button", { name: "New project" }).click();
    await page.locator("#name").fill(existingName);
    await page.locator("#client").fill("First Client");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByRole("link", { name: `Open ${existingName}` })).toBeVisible({
      timeout: 15_000
    });

    await page.getByRole("button", { name: "New project" }).click();
    await page.locator("#name").fill(existingName);
    await page.locator("#client").fill("Second Client");
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByRole("heading", { name: "New project" })).toBeVisible();
    await expect(page.getByText("Name is already taken in this workspace")).toBeVisible();
  });

  test("shows inline required field errors in create modal", async ({ page }) => {
    await page.getByRole("button", { name: "New project" }).click();
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByRole("heading", { name: "New project" })).toBeVisible();
    await expect(page.getByText("Project name is required.")).toBeVisible();
    await expect(page.getByText("Client is required.")).toBeVisible();
  });

  test("opens the clicked project row", async ({ page }) => {
    const projectName = `E2E Open Project ${Date.now()}`;
    const clientName = "Open Client";

    await page.getByRole("button", { name: "New project" }).click();
    await page.locator("#name").fill(projectName);
    await page.locator("#client").fill(clientName);
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByRole("link", { name: `Open ${projectName}` })).toBeVisible({
      timeout: 15_000
    });

    await page.getByRole("link", { name: `Open ${projectName}` }).click();
    await expect(page.getByText(projectName)).toBeVisible();
    await expect(page.getByText(`Client: ${clientName}`)).toBeVisible();
  });

  test("opens project overview tab from list", async ({ page }) => {
    const projectName = `E2E Overview ${Date.now()}`;

    await page.getByRole("button", { name: "New project" }).click();
    await page.locator("#name").fill(projectName);
    await page.locator("#client").fill("Overview Client");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByRole("link", { name: `Open ${projectName}` })).toBeVisible({
      timeout: 15_000
    });

    await page.getByRole("link", { name: `Open ${projectName}` }).click();
    await expect(page.getByRole("navigation", { name: "Project sections" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/overview$/);
    await expect(page.getByText("Team time on this project")).toBeVisible();
  });

  test("opens project tasks tab from list", async ({ page }) => {
    const projectName = `E2E Tasks ${Date.now()}`;

    await page.getByRole("button", { name: "New project" }).click();
    await page.locator("#name").fill(projectName);
    await page.locator("#client").fill("Tasks Client");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByRole("link", { name: `Open ${projectName}` })).toBeVisible({
      timeout: 15_000
    });

    await page.getByRole("link", { name: `Open ${projectName}` }).click();
    await expect(page.getByRole("navigation", { name: "Project sections" })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Project sections" })
      .getByRole("link", { name: "Tasks", exact: true })
      .click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/tasks$/);
    await expect(
      page.getByText("Define the task list members choose when logging time on this project.")
    ).toBeVisible();
  });

  test("shows add team member action on project team tab", async ({ page }) => {
    const projectName = `E2E Team ${Date.now()}`;

    await page.getByRole("button", { name: "New project" }).click();
    await page.locator("#name").fill(projectName);
    await page.locator("#client").fill("Team Client");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByRole("link", { name: `Open ${projectName}` })).toBeVisible({
      timeout: 15_000
    });

    await page.getByRole("link", { name: `Open ${projectName}` }).click();
    await page
      .getByRole("navigation", { name: "Project sections" })
      .getByRole("link", { name: "Team", exact: true })
      .click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/team$/);
    await expect(page.getByRole("button", { name: "Add team member" })).toBeVisible();
  });

  test("add team member modal has searchable workspace member field", async ({ page }) => {
    const projectName = `E2E Team Modal ${Date.now()}`;

    await page.getByRole("button", { name: "New project" }).click();
    await page.locator("#name").fill(projectName);
    await page.locator("#client").fill("Team Modal Client");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByRole("link", { name: `Open ${projectName}` })).toBeVisible({
      timeout: 15_000
    });

    await page.getByRole("link", { name: `Open ${projectName}` }).click();
    await page
      .getByRole("navigation", { name: "Project sections" })
      .getByRole("link", { name: "Team", exact: true })
      .click();
    await page.getByRole("button", { name: "Add team member" }).click();
    await expect(page.getByRole("heading", { name: "Add team member" })).toBeVisible();
    await page.getByRole("combobox", { name: "Workspace member" }).click();
    await expect(page.getByPlaceholder("Search by name or email…")).toBeVisible();
  });
});
