import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../../admin/e2e/helpers/auth";
import { SEED } from "./constants/seed";
import { loginAsMember } from "./helpers/auth";
import { dismissOnboardingIfVisible } from "./helpers/onboarding";
import {
  fillTimeEntryDialog,
  saveTimeEntryDialog,
  uniqueTimelogMarker,
  uniqueTimeSlot
} from "./helpers/time-entry";

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? "http://localhost:3002";
const PROJECT = /Client Portal Redesign/;
const TASK = /UX research/;

test.describe("Client to admin timelog sync", () => {
  test("admin time tracker shows member entry without reload", async ({ browser }) => {
    const marker = uniqueTimelogMarker("e2e-client-admin");
    const { startTime, endTime } = uniqueTimeSlot();

    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();
    await loginAsMember(clientPage);
    await clientPage.goto("/time-tracker");
    await dismissOnboardingIfVisible(clientPage);
    await clientPage.getByRole("button", { name: "Add Entry" }).click();
    await fillTimeEntryDialog(clientPage, {
      projectName: PROJECT,
      taskName: TASK,
      description: marker,
      startTime,
      endTime
    });
    const createResponse = clientPage.waitForResponse(
      (response) =>
        response.url().includes("/timelogs") &&
        response.request().method() === "POST" &&
        response.ok()
    );
    await saveTimeEntryDialog(clientPage);
    await createResponse;
    await expect(clientPage.getByText(marker)).toBeVisible({ timeout: 20_000 });

    const adminContext = await browser.newContext({ baseURL: ADMIN_BASE_URL });
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);
    await adminPage.goto("/time-tracker");
    await expect(adminPage.getByRole("heading", { name: "Time Tracker", exact: true })).toBeVisible(
      { timeout: 30_000 }
    );
    await adminPage.getByRole("combobox", { name: /member/i }).click();
    await adminPage
      .getByRole("option", { name: new RegExp(SEED.personas.member.name, "i") })
      .click();
    await adminPage.getByPlaceholder("Search entries...").fill(marker);
    await expect(adminPage.getByText(marker)).toBeVisible({ timeout: 30_000 });

    await clientContext.close();
    await adminContext.close();
  });
});
