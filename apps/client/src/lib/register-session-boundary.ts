import { registerSessionBoundaryHandler } from "@kloqra/web-shared";
import { clearAssistantStorage } from "@/features/assistant/assistant-storage";
import { useWidgetLayout } from "@/features/dashboard/use-widget-layout";
import { clearLegacyOnboardingStorage } from "@/features/onboarding/use-onboarding-status";
import {
  useMemberReportingStore,
  useMySubmissionsStore,
  useActiveTimerSessionStore
} from "@/stores/member-data.store";
import { useOfflineStore } from "@/stores/offline-store";
import { useProjectsStore } from "@/stores/projects.store";
import { useTimerStore } from "@/stores/timer.store";
import { useTimesheetStore } from "@/stores/timesheet.store";
import { useUiStore } from "@/stores/ui.store";

registerSessionBoundaryHandler(({ level, prev }) => {
  if (level === "full") {
    useOfflineStore.getState().clearQueue();
    useProjectsStore.getState().clear();
    useTimerStore.getState().clear();
    useTimesheetStore.getState().clear();
    useMemberReportingStore.getState().clear();
    useMySubmissionsStore.getState().clear();
    useActiveTimerSessionStore.getState().clear();
    useWidgetLayout.getState().clear();
    useUiStore.getState().clear();
    clearAssistantStorage();
    clearLegacyOnboardingStorage();
    return;
  }

  if (level === "workspace" && prev?.workspaceId) {
    const workspaceId = prev.workspaceId;
    useProjectsStore.getState().clear();
    useTimerStore.getState().clear();
    useTimesheetStore.getState().clear();
    useMemberReportingStore.getState().removeWorkspace(workspaceId);
    useMySubmissionsStore.getState().invalidate(workspaceId);
    useActiveTimerSessionStore.getState().removeWorkspace(workspaceId);
    useWidgetLayout.getState().removeWorkspace(workspaceId);
    useOfflineStore.getState().hydrateForSession();
  }
});
