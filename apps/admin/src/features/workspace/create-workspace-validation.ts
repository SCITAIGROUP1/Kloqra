export type CreateWorkspaceFieldErrors = {
  name?: string;
};

export function validateCreateWorkspaceForm(name: string): CreateWorkspaceFieldErrors {
  const fieldErrors: CreateWorkspaceFieldErrors = {};
  if (!name.trim()) fieldErrors.name = "Workspace name is required.";
  return fieldErrors;
}
