import { test, expect } from "@playwright/test";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";
import {
  fillTimeEntryDialog,
  openTimesheetSlot,
  saveTimeEntryDialog,
  uniqueTimelogMarker
} from "./helpers/time-entry";

const PROJECT = /Client Portal Redesign/;
const TASK = /UX research/;
const TASK_LABEL = "UX research";

test.describe("Timelog cross-page sync", () => {
  test("create on timesheet day view appears without reload", async ({ page }) => {
    const marker = uniqueTimelogMarker("e2e-timesheet-sync");

    await page.goto("/timesheet");
    await dismissOnboardingIfVisible(page);
    await page.getByRole("button", { name: "day", exact: true }).click();
    await page.getByRole("button", { name: "Today" }).click();
    await openTimesheetSlot(page, 10);

    await fillTimeEntryDialog(page, {
      projectName: PROJECT,
      taskName: TASK,
      description: marker,
      startTime: "10:00",
      endTime: "11:00"
    });
    await saveTimeEntryDialog(page);
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
  });

  test("create on time tracker appears on timesheet without reload", async ({ page }) => {
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
      startTime: "14:00",
      endTime: "15:00"
    });
    await saveTimeEntryDialog(page);
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });

    await page.goto("/timesheet");
    await dismissOnboardingIfVisible(page);
    await page.getByRole("button", { name: "week", exact: true }).click();
    await page.getByRole("button", { name: "Today" }).click();
    // Week view shows task name on blocks, not the description.
    await expect(
      page.getByRole("button", { name: new RegExp(TASK_LABEL, "i") }).first()
    ).toBeVisible({
      timeout: 20_000
    });
  });
});
