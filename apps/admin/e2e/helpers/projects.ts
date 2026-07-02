import { expect, type Page } from "@playwright/test";

export async function expectProjectInList(page: Page, projectName: string) {
  await page.getByRole("textbox", { name: "Search projects" }).fill(projectName);
  await expect(page.getByRole("link", { name: `Open ${projectName}` })).toBeVisible({
    timeout: 15_000
  });
}
