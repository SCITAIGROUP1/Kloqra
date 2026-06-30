import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

async function openGlobalSearch(page: Page) {
  await page.keyboard.press("ControlOrMeta+KeyK");
  const dialog = page.getByRole("dialog", { name: "Global search" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Admin global search", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  });

  test("does not show a toolbar search field", async ({ page }) => {
    await expect(page.getByTestId("global-search-open")).toHaveCount(0);
  });

  test("opens command palette with keyboard shortcut", async ({ page }) => {
    await openGlobalSearch(page);
    await expect(page.getByText("Pages")).toBeVisible();
    await expect(page.getByRole("option", { name: "Projects", exact: true })).toBeVisible();
  });

  test("finds seeded projects and navigates on select", async ({ page }) => {
    const dialog = await openGlobalSearch(page);
    const input = dialog.getByPlaceholder("Search pages, projects, tasks, people…");
    const projectsResponse = page.waitForResponse((response) => {
      if (response.request().method() !== "GET" || !response.ok()) return false;
      try {
        const url = new URL(response.url());
        return url.pathname.endsWith("/projects") && url.searchParams.get("search") === "Audit";
      } catch {
        return false;
      }
    });
    await input.fill("Audit");
    await projectsResponse;
    const projectHit = dialog.getByText("Annual Audit", { exact: true });
    await expect(projectHit).toBeVisible({ timeout: 15_000 });
    await projectHit.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/overview$/);
    await expect(page.getByText("Annual Audit").first()).toBeVisible();
  });

  test("navigates to approvals page from pages group", async ({ page }) => {
    await openGlobalSearch(page);
    await page.getByRole("option", { name: "Approvals", exact: true }).click();
    await expect(page).toHaveURL(/\/approvals$/);
    await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible();
  });

  test("dashboard does not horizontally overflow on a 1366×768 laptop viewport", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });
});
