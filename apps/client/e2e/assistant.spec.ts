import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";

test.describe("Assistant help", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await dismissOnboardingIfVisible(page);
  });

  test("opens assistant from help menu and shows starter prompts", async ({ page }) => {
    await page.getByRole("button", { name: "Help menu" }).click();
    await page.getByRole("button", { name: "Ask Kloqra" }).click();

    await expect(page.getByRole("dialog", { name: "Help assistant" })).toBeVisible();
    await expect(page.getByRole("button", { name: "How do I start a timer?" })).toBeVisible();
  });

  test("opens assistant from bottom-right FAB", async ({ page }) => {
    await page.getByRole("button", { name: "Open help assistant" }).click();

    await expect(page.getByRole("dialog", { name: "Help assistant" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Customize my dashboard" })).toBeVisible();
  });

  test("sends a question and shows a reply with timer link", async ({ page }) => {
    await page.getByRole("button", { name: "Help menu" }).click();
    await page.getByRole("button", { name: "Ask Kloqra" }).click();
    await page.getByRole("button", { name: "How do I start a timer?" }).click();

    await expect(page.getByRole("link", { name: "Timer" })).toBeVisible({ timeout: 15_000 });
  });

  test("clears conversation with new chat", async ({ page }) => {
    await page.getByRole("button", { name: "Open help assistant" }).click();
    await page.getByRole("button", { name: "How do I start a timer?" }).click();
    await expect(page.getByRole("link", { name: "Timer" })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Start new chat" }).click();
    await expect(page.getByRole("button", { name: "How do I start a timer?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Timer" })).not.toBeVisible();
  });

  test("toggles assistant with keyboard shortcut", async ({ page }) => {
    await page.keyboard.press(process.platform === "darwin" ? "Meta+/" : "Control+/");
    await expect(page.getByRole("dialog", { name: "Help assistant" })).toBeVisible();

    await page.keyboard.press(process.platform === "darwin" ? "Meta+/" : "Control+/");
    await expect(page.getByRole("dialog", { name: "Help assistant" })).not.toBeVisible();
  });
});
