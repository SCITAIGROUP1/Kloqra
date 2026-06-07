import { test } from "@playwright/test";

test("capture bottom timesheet screenshot", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "member@chronomint.dev");
  await page.fill("#password", "password123");
  await page.click("button[type='submit']");
  await page.waitForURL("**/timer");
  await page.goto("/timesheet");
  await page.waitForSelector("[data-day-column]");

  // Scroll everything to the bottom
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    const scrollContainers = document.querySelectorAll(".overflow-y-auto");
    scrollContainers.forEach((container) => {
      container.scrollTop = container.scrollHeight;
    });
  });

  await page.waitForTimeout(2000);

  await page.screenshot({
    path: "/Users/chamal/.gemini/antigravity/brain/1fcfed9b-4a48-4928-afc2-fe70654db985/media__current_bottom.png"
  });
});
