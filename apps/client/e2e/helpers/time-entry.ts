import { expect, type Page } from "@playwright/test";

export type TimeEntryDialogOptions = {
  projectName: RegExp | string;
  taskName: RegExp | string;
  description: string;
  startTime?: string;
  endTime?: string;
};

/** Matches empty calendar slot labels ("10 AM", "10:30 AM", "14:00", etc.). */
const TIME_SLOT_LABEL = /^\d{1,2}(:\d{2})?\s*(AM|PM)?$/i;

async function selectComboboxOption(page: Page, label: string, option: RegExp | string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option }).click();
}

/** Click the first open empty timesheet slot; opens the "Log time" dialog with prefilled times. */
export async function openTimesheetSlot(page: Page) {
  const dayColumn = page.locator("[data-day-column]").first();
  await dayColumn.waitFor({ state: "visible" });

  const slots = dayColumn.locator("button[aria-label]");
  const count = await slots.count();

  // Prefer later hours (less overlap from seed/e2e) and iterate backward.
  for (let i = count - 1; i >= 0; i--) {
    const slot = slots.nth(i);
    const label = (await slot.getAttribute("aria-label"))?.trim() ?? "";
    if (!TIME_SLOT_LABEL.test(label)) continue;
    if ((await slot.getAttribute("aria-disabled")) === "true") continue;

    try {
      await slot.scrollIntoViewIfNeeded();
      await slot.click({ timeout: 3_000 });
      await expect(page.getByRole("heading", { name: "Log time" })).toBeVisible({
        timeout: 3_000
      });
      return;
    } catch {
      await page.keyboard.press("Escape").catch(() => {});
    }
  }

  throw new Error("No open timesheet slot found");
}

export async function fillTimeEntryDialog(page: Page, options: TimeEntryDialogOptions) {
  await selectComboboxOption(page, "Project", options.projectName);
  await selectComboboxOption(page, "Task", options.taskName);

  if (options.startTime) {
    await page.getByLabel("Start time").fill(options.startTime);
  }
  if (options.endTime) {
    await page.getByLabel("End time").fill(options.endTime);
  }

  await page.getByLabel("Description").fill(options.description);
}

export async function saveTimeEntryDialog(page: Page) {
  await page.getByRole("button", { name: "Log time" }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 20_000 });
}

export async function saveTimeEntryChanges(page: Page) {
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Time entry updated!")).toBeVisible({ timeout: 15_000 });
}

export function uniqueTimelogMarker(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

let timeSlotSeq = 0;

/** Pick a morning slot unlikely to collide with seed data or prior e2e runs. */
export function uniqueTimeSlot(): { startTime: string; endTime: string } {
  const hour = 4 + ((Math.floor(Date.now() / 1000) + timeSlotSeq++) % 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { startTime: `${pad(hour)}:10`, endTime: `${pad(hour)}:40` };
}
