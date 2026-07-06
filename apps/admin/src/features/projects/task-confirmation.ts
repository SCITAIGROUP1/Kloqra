import type { TaskDto } from "@kloqra/contracts";

export type TaskConfirmAction = "delete" | "deactivate" | "activate";

export type TaskConfirmContext = Pick<TaskDto, "taskName" | "categoryName"> & {
  categoryIsActive: boolean;
  projectIsActive: boolean;
};

function parentStatusSentence(categoryIsActive: boolean, projectIsActive: boolean): string {
  if (!projectIsActive && !categoryIsActive) {
    return "The project and this task's category are currently inactive.";
  }
  if (!projectIsActive) return "The project is currently inactive.";
  if (!categoryIsActive) return "This task's category is currently inactive.";
  return "";
}

export function getTaskConfirmCopy(
  action: TaskConfirmAction,
  task: TaskConfirmContext
): {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
} {
  const categoryLabel = task.categoryName ?? "its category";

  switch (action) {
    case "delete":
      return {
        title: `Delete "${task.taskName}"?`,
        description:
          "Existing time entries for this task will be moved to the project's Uncategorized Task. Entries are preserved. This cannot be undone.",
        confirmLabel: "Delete task",
        destructive: true
      };
    case "deactivate":
      return {
        title: `Deactivate "${task.taskName}"?`,
        description:
          "Members will not be able to log time or start a timer on this task. Existing time entries for this task will become read-only until the task is activated again.",
        confirmLabel: "Deactivate",
        destructive: true
      };
    case "activate": {
      const parentNote = parentStatusSentence(task.categoryIsActive, task.projectIsActive);
      return {
        title: `Activate "${task.taskName}"?`,
        description: [
          parentNote,
          `This task will be available for time logging again in ${categoryLabel}, as long as the project and category remain active.`
        ]
          .filter(Boolean)
          .join(" "),
        confirmLabel: "Activate",
        destructive: false
      };
    }
  }
}
