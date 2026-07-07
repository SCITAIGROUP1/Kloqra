import { expect, type Page } from "@playwright/test";

export type TimeEntryDialogOptions = {
  projectName: RegExp | string;
  taskName: RegExp | string;
  description: string;
  startTime?: string;
  endTime?: string;
};

async function selectComboboxOption(page: Page, label: string, option: RegExp | string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option }).click();
}

/** Click an open timesheet slot (locale-aware: "10 AM", "10:00 AM", etc.). */
export async function openTimesheetSlot(page: Page, hour: number, minute = 0) {
  const hour12 = hour % 12 || 12;
  const meridiem = hour < 12 ? "AM" : "PM";
  const minutePart = minute === 0 ? "(\\s*:00)?" : `\\s*:${String(minute).padStart(2, "0")}`;
  const patterns = [
    new RegExp(`^${hour}${minutePart}\\s*(AM|PM)?$`, "i"),
    new RegExp(`^${hour12}${minutePart}\\s*${meridiem}$`, "i")
  ];

  for (const pattern of patterns) {
    const slot = page.getByRole("button", { name: pattern }).first();
    if ((await slot.count()) > 0) {
      await slot.click();
      await expect(page.getByRole("heading", { name: "Log time" })).toBeVisible({
        timeout: 10_000
      });
      return;
    }
  }

  throw new Error(`No open timesheet slot found for ${hour}:${String(minute).padStart(2, "0")}`);
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
