export type EntityConfirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
};

export function getDeleteCategoryConfirmation(categoryName: string): EntityConfirmation {
  return {
    title: "Delete category?",
    description: `Delete "${categoryName}"? Tasks in this category will be moved to Uncategorized. This cannot be undone.`,
    confirmLabel: "Delete",
    destructive: true
  };
}

export function getDeactivateCategoryConfirmation(categoryName: string): EntityConfirmation {
  return {
    title: "Deactivate category?",
    description: `Deactivate "${categoryName}"? Tasks in this category will be hidden from time logging, and existing entries on those tasks become read-only (no edit or delete).`,
    confirmLabel: "Deactivate",
    destructive: true
  };
}

export function getActivateCategoryConfirmation(categoryName: string): EntityConfirmation {
  return {
    title: "Activate category?",
    description: `Activate "${categoryName}"? Tasks in this category become loggable again when each task is also active.`,
    confirmLabel: "Activate"
  };
}
