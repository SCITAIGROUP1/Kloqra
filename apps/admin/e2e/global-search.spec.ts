import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import { expectProjectInList } from "./helpers/projects";

async function openGlobalSearch(page: Page) {
  await page.keyboard.press("ControlOrMeta+KeyK");
  const dialog = page.getByRole("dialog", { name: "Global search" });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
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

  test("finds projects and navigates on select", async ({ page }) => {
    const projectName = `Annual Audit ${Date.now()}`;

    await page.goto("/projects");
    await page.getByRole("button", { name: "New project" }).click();
    await page.locator("#name").fill(projectName);
    await page.locator("#client").fill("Adventure Works");
    await page.getByRole("button", { name: "Create project" }).click();
    await expectProjectInList(page, projectName);

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
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
    const projectHit = dialog.getByText(projectName, { exact: true });
    await expect(projectHit).toBeVisible({ timeout: 15_000 });
    await projectHit.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/overview$/);
    await expect(page.getByText(projectName).first()).toBeVisible();
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
