import type { CategoryDto } from "@kloqra/contracts";

export type CategoryConfirmAction = "delete" | "deactivate" | "activate";

function taskCountLabel(count: number): string {
  return `${count} task${count === 1 ? "" : "s"}`;
}

function taskCountSentence(count: number): string {
  if (count === 0) return "No tasks are currently assigned to this category.";
  return `This category has ${taskCountLabel(count)}.`;
}

export function getCategoryConfirmCopy(
  action: CategoryConfirmAction,
  category: Pick<CategoryDto, "name" | "taskCount">
): {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
} {
  const taskCount = category.taskCount ?? 0;
  const taskIntro = taskCountSentence(taskCount);

  switch (action) {
    case "delete":
      return {
        title: `Delete "${category.name}"?`,
        description: `${taskIntro} Tasks in this category will be moved to Uncategorized. Existing time entries will not be deleted. This cannot be undone.`,
        confirmLabel: "Delete category",
        destructive: true
      };
    case "deactivate":
      return {
        title: `Deactivate "${category.name}"?`,
        description: `${taskIntro} Members will not be able to log time on tasks in this category. Existing time entries for those tasks will become read-only until the category is activated again.`,
        confirmLabel: "Deactivate",
        destructive: true
      };
    case "activate":
      return {
        title: `Activate "${category.name}"?`,
        description: `${taskIntro} Tasks in this category will be available for time logging again, as long as each task and its project are also active.`,
        confirmLabel: "Activate",
        destructive: false
      };
  }
}
