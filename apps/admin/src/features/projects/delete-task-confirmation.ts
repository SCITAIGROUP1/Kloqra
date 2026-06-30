export const DELETE_TASK_TIME_ENTRY_NOTICE =
  "Time entries linked to this task will not be deleted but will lose their task reference.";

export function getDeleteTaskConfirmationMessage(taskName: string): string {
  return `Delete task "${taskName}"?\n\n${DELETE_TASK_TIME_ENTRY_NOTICE}`;
}
