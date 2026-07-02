import type { EntityConfirmation } from "../categories/category-confirmation";

export function getDeactivateProjectConfirmation(projectName: string): EntityConfirmation {
  return {
    title: "Deactivate project?",
    description: `Deactivate "${projectName}"? It will be hidden from time logging, and all time entries on this project become read-only (no edit or delete). Members with running timers should stop them manually.`,
    confirmLabel: "Deactivate",
    destructive: true
  };
}

export function getActivateProjectConfirmation(projectName: string): EntityConfirmation {
  return {
    title: "Activate project?",
    description: `Activate "${projectName}"? It will be available for time logging again, and existing entries become editable (subject to normal approval locks).`,
    confirmLabel: "Activate"
  };
}
