import type { EntityConfirmation } from "../categories/category-confirmation";

export const DELETE_TASK_TIME_ENTRY_NOTICE =
  "Time entries linked to this task will not be deleted but will lose their task reference.";

export function getDeleteTaskConfirmation(taskName: string): EntityConfirmation {
  return {
    title: "Delete task?",
    description: `Delete "${taskName}"? ${DELETE_TASK_TIME_ENTRY_NOTICE}`,
    confirmLabel: "Delete",
    destructive: true
  };
}

export function getDeactivateTaskConfirmation(taskName: string): EntityConfirmation {
  return {
    title: "Deactivate task?",
    description: `Deactivate "${taskName}"? It will be hidden from time logging, and existing entries on this task become read-only (no edit or delete).`,
    confirmLabel: "Deactivate",
    destructive: true
  };
}

export function getActivateTaskConfirmation(taskName: string): EntityConfirmation {
  return {
    title: "Activate task?",
    description: `Activate "${taskName}"? It will be available for time logging again, and existing entries become editable (subject to normal approval locks).`,
    confirmLabel: "Activate"
  };
}

/** @deprecated Use getDeleteTaskConfirmation for ConfirmDialog title/description. */
export function getDeleteTaskConfirmationMessage(taskName: string): string {
  const { title, description } = getDeleteTaskConfirmation(taskName);
  return `${title}\n\n${description}`;
}
