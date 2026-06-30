import type { StartupPagePreference } from "@kloqra/contracts";

const STARTUP_PATHS: Record<StartupPagePreference, string> = {
  dashboard: "/dashboard",
  timer: "/timer",
  timesheet: "/timesheet",
  "time-tracker": "/time-tracker"
};

export function resolveStartupPath(preference?: StartupPagePreference): string {
  if (!preference) return "/dashboard";
  return STARTUP_PATHS[preference] ?? "/dashboard";
}
