"use client";

import { useWorkspaceStaleRefetch } from "@kloqra/web-shared";

/** Re-fetch timelog-backed views when any page saves, updates, or deletes entries. */
export function useTimelogStaleRefetch(workspaceId: string, callback: () => void, enabled = true) {
  useWorkspaceStaleRefetch(workspaceId, ["timelogs", "timesheet"], callback, enabled);
}
