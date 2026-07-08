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

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** App modal only — excludes Radix date-picker popovers that also use role="dialog". */
function entryDialog(page: Page) {
  return page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: /^(Add time entry|Log time|Edit time entry)$/ })
  });
}

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

async function pickLowCollisionEntryDate(page: Page) {
  const dialog = entryDialog(page);
  if (!(await dialog.isVisible({ timeout: 1000 }).catch(() => false))) return;

  const entryDate = dialog.getByRole("button", { name: "Entry date" });
  if (!(await entryDate.isVisible({ timeout: 1000 }).catch(() => false))) return;
  await entryDate.click();

  const target = new Date();
  // 1–2 days ago keeps the entry inside the current tracker week on most run days.
  target.setDate(target.getDate() - (1 + (timeSlotSeq % 2)));
  const dateKey = toDateKey(target);

  const popover = page.locator('[data-state="open"][data-side]').last();

  for (let guard = 0; guard < 12; guard += 1) {
    const day = popover.getByRole("button", { name: dateKey, exact: true });
    if (await day.isVisible({ timeout: 500 }).catch(() => false)) {
      await day.click();
      await expect(popover).toBeHidden({ timeout: 3_000 });
      return;
    }
    await popover.getByRole("button", { name: "Previous month" }).click();
  }

  await popover.getByRole("button", { name: dateKey, exact: true }).click();
  await expect(popover).toBeHidden({ timeout: 3_000 });
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

  // Keep the default entry date (today) — unique afternoon slots avoid overlap.
  await page.getByLabel("Description").fill(options.description);
}

export async function saveTimeEntryDialog(page: Page) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await entryDialog(page).getByRole("button", { name: "Log time" }).click();
    const overlap = page.getByText(/overlaps|two projects at once/i);
    if (await overlap.isVisible({ timeout: 1500 }).catch(() => false)) {
      const retry = uniqueTimeSlot();
      await page.getByLabel("Start time").fill(retry.startTime);
      await page.getByLabel("End time").fill(retry.endTime);
      await pickLowCollisionEntryDate(page);
      continue;
    }
    await expect(page.getByText("Time entry created!")).toBeVisible({ timeout: 20_000 });
    await expect(entryDialog(page)).toBeHidden({ timeout: 5_000 });
    return;
  }
  await expect(page.getByText("Time entry created!")).toBeVisible({ timeout: 20_000 });
  await expect(entryDialog(page)).toBeHidden({ timeout: 5_000 });
}

export async function saveTimeEntryChanges(page: Page) {
  await entryDialog(page).getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Time entry updated!")).toBeVisible({ timeout: 15_000 });
  await expect(entryDialog(page)).toBeHidden({ timeout: 5_000 });
}

export function uniqueTimelogMarker(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

let timeSlotSeq = 0;

/** Pick an afternoon slot unlikely to collide with seed data or prior e2e runs. */
export function uniqueTimeSlot(): { startTime: string; endTime: string } {
  timeSlotSeq += 1;
  const seed = Date.now() + timeSlotSeq * 7919 + Math.floor(Math.random() * 60_000);
  const hour = 14 + Math.floor((seed / 1000) % 8);
  const minute = (seed % 50) + 5;
  const pad = (n: number) => String(n).padStart(2, "0");
  const endTotal = hour * 60 + minute + 25;
  return {
    startTime: `${pad(hour)}:${pad(minute)}`,
    endTime: `${pad(Math.floor(endTotal / 60) % 24)}:${pad(endTotal % 60)}`
  };
}
