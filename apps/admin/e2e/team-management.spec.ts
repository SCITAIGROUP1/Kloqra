import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Team Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("shows team management page with stats and member table", async ({ page }) => {
    await page.goto("/team-management");
    await expect(page.getByRole("heading", { name: "Team Management" })).toBeVisible();
    await expect(page.getByText("Total Members")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Member" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Team Member" })).toBeVisible();
  });

  test("opens add team member modal with email and name fields", async ({ page }) => {
    await page.goto("/team-management");
    await page.getByRole("button", { name: "Add Team Member" }).click();
    await expect(page.getByRole("heading", { name: "Add team member" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
    await expect(page.getByText("Name (optional)")).toHaveCount(0);
    await expect(page.getByText("New users receive sign-in credentials by email.")).toBeVisible();
  });

  test("shows inline required field errors in add team member modal", async ({ page }) => {
    await page.goto("/team-management");
    await page.getByRole("button", { name: "Add Team Member" }).click();
    await page.getByRole("button", { name: "Add member" }).click();

    await expect(page.getByRole("heading", { name: "Add team member" })).toBeVisible();
    await expect(page.getByText("Email is required.")).toBeVisible();
    await expect(page.getByText("Name is required.")).toBeVisible();
  });

  test("shows no-match message when search finds no members", async ({ page }) => {
    await page.goto("/team-management");
    await page.getByRole("textbox", { name: "Search team members" }).fill("zzzz-no-member-xyz-999");
    await expect(page.getByText("No team members found matching your search.")).toBeVisible();
    await expect(page.getByText("No matching members")).toHaveCount(0);
    await expect(page.getByText("Try a different search term.")).toHaveCount(0);
  });

  test("shows rows-per-page selector with 10, 25, and 50 options", async ({ page }) => {
    await page.goto("/team-management");
    const rowsPerPage = page.getByRole("combobox", { name: "Rows per page" });
    await expect(rowsPerPage).toBeVisible();
    await expect(rowsPerPage).toHaveText("25");

    await rowsPerPage.click();
    await expect(page.getByRole("option", { name: "25" })).toBeVisible();
    await expect(page.getByRole("option", { name: "50" })).toBeVisible();
    await page.getByRole("option", { name: "25" }).click();
    await expect(rowsPerPage).toHaveText("25");
  });

  test("shows status filter with all, active, and inactive options", async ({ page }) => {
    await page.goto("/team-management");
    const statusFilter = page.getByRole("combobox", { name: "Filter by status" });
    await expect(statusFilter).toBeVisible();
    await expect(statusFilter).toHaveText("All statuses");

    await statusFilter.click();
    await expect(page.getByRole("option", { name: "Active", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: "Inactive", exact: true })).toBeVisible();
    await page.getByRole("option", { name: "Active", exact: true }).click();
    await expect(statusFilter).toHaveText("Active");
  });

  test("actions menu includes change status for another member", async ({ page }) => {
    await page.goto("/team-management");
    const actionButton = page.getByRole("button", { name: /Actions for / }).first();
    await actionButton.click();
    await expect(page.getByText("Change status")).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Deactivate" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "View Profile" })).toBeVisible();
  });
});
