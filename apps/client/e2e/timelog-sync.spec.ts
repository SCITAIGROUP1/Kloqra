import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";
import {
  fillTimeEntryDialog,
  saveTimeEntryDialog,
  uniqueTimelogMarker
} from "./helpers/time-entry";

const PROJECT = /Client Portal Redesign/;
const TASK = /UX research/;

test.describe("Timelog cross-page sync", () => {
  test("new entry on timesheet appears without reload", async ({ page }) => {
    const marker = uniqueTimelogMarker("e2e-timesheet-sync");

    await page.goto("/timesheet");
    await dismissOnboardingIfVisible(page);
    await page.getByRole("button", { name: "week", exact: true }).click();
    await page
      .getByRole("button", { name: /^10:00/ })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: "Log time" })).toBeVisible();

    await fillTimeEntryDialog(page, {
      projectName: PROJECT,
      taskName: TASK,
      description: marker,
      startTime: "10:00",
      endTime: "10:30"
    });
    await saveTimeEntryDialog(page);
    await expect(page.getByText("Time entry created!")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
  });

  test("new entry on time tracker appears on timesheet without reload", async ({ page }) => {
    const marker = uniqueTimelogMarker("e2e-sync");

    await page.goto("/time-tracker");
    await dismissOnboardingIfVisible(page);
    await expect(page.getByRole("heading", { name: "Time Tracker", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Add Entry" }).click();
    await expect(page.getByRole("heading", { name: "Add time entry" })).toBeVisible();

    await fillTimeEntryDialog(page, {
      projectName: PROJECT,
      taskName: TASK,
      description: marker,
      startTime: "03:15",
      endTime: "03:45"
    });
    await saveTimeEntryDialog(page);
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });

    await page.goto("/timesheet");
    await dismissOnboardingIfVisible(page);
    await page.getByRole("button", { name: "week", exact: true }).click();
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
  });
});
