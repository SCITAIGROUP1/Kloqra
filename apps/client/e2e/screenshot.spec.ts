import { test } from "@playwright/test";

test.skip(!!process.env.CI, "Local screenshot capture only — not run in CI");

test("capture bottom timesheet screenshot", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "member@kloqra.dev");
  await page.fill("#password", "password123");
  await page.click("button[type='submit']");
  await page.waitForURL("**/timer");
  await page.goto("/timesheet");
  await page.waitForSelector("[data-day-column]");

  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    const scrollContainers = document.querySelectorAll(".overflow-y-auto");
    scrollContainers.forEach((container) => {
      container.scrollTop = container.scrollHeight;
    });
  });

  await page.waitForTimeout(2000);

  await page.screenshot({ path: "test-results/timesheet-bottom.png", fullPage: true });
});
