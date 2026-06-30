import { describe, expect, it } from "vitest";
import {
  ONBOARDING_STEP_IDS,
  PROJECTS_DASHBOARD_CARDS,
  TOTAL_ONBOARDING_STEPS,
  TRACK_TIME_CARDS,
  getStepNumber,
  getStepTitle
} from "./onboarding-steps";

describe("onboarding-steps", () => {
  it("defines five steps in order", () => {
    expect(ONBOARDING_STEP_IDS).toEqual([
      "welcome",
      "workspace",
      "track-time",
      "projects-dashboard",
      "finish"
    ]);
    expect(TOTAL_ONBOARDING_STEPS).toBe(5);
  });

  it("returns 1-based step numbers", () => {
    expect(getStepNumber("welcome")).toBe(1);
    expect(getStepNumber("finish")).toBe(5);
  });

  it("returns role-specific workspace titles", () => {
    expect(getStepTitle("workspace", "Alex", true)).toBe("Create your first project");
    expect(getStepTitle("workspace", "Alex", false)).toBe("Your assigned projects");
  });

  it("includes three track-time feature cards", () => {
    expect(TRACK_TIME_CARDS).toHaveLength(3);
    expect(TRACK_TIME_CARDS.map((c) => c.title)).toEqual(["Timer", "Time Tracker", "Timesheet"]);
  });

  it("includes two projects-dashboard feature cards", () => {
    expect(PROJECTS_DASHBOARD_CARDS).toHaveLength(2);
    expect(PROJECTS_DASHBOARD_CARDS.map((c) => c.route)).toEqual(["/projects", "/dashboard"]);
  });
});
