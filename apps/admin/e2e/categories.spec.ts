import { test, expect } from "@playwright/test";

test.describe("Admin categories", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/categories");
    await expect(page.getByRole("heading", { name: "Categories", exact: true })).toBeVisible();
  });

  test("lists seeded categories", async ({ page }) => {
    await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();
    await expect(page.getByText("Software Development").first()).toBeVisible();
  });

  test("creates, edits, and deletes an empty category", async ({ page }) => {
    const uniqueName = `E2E Category ${Date.now()}`;
    const updatedName = `${uniqueName} Updated`;

    await page.getByLabel("Name").first().fill(uniqueName);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("row", { name: new RegExp(uniqueName) })).toBeVisible();

    const row = page.getByRole("row", { name: new RegExp(uniqueName) });
    await row.getByRole("button", { name: "Edit" }).click();
    await row.getByRole("textbox").first().fill(updatedName);
    await row.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("row", { name: new RegExp(updatedName) })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("row", { name: new RegExp(updatedName) })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(page.getByRole("row", { name: new RegExp(updatedName) })).toHaveCount(0);
  });
});
