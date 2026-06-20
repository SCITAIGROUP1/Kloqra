import { test, expect } from "@playwright/test";

test("admin login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /admin sign in/i })).toBeVisible();
});

test("shows friendly message for invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@kloqra.dev");
  await page.getByRole("textbox", { name: "Password" }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password. Please try again.")).toBeVisible();
});
