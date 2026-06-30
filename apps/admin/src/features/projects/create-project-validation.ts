export type CreateProjectFieldErrors = {
  name?: string;
  clientName?: string;
};

export function validateCreateProjectForm(
  name: string,
  clientName: string
): CreateProjectFieldErrors {
  const fieldErrors: CreateProjectFieldErrors = {};
  if (!name.trim()) fieldErrors.name = "Project name is required.";
  if (!clientName.trim()) fieldErrors.clientName = "Client is required.";
  return fieldErrors;
}
