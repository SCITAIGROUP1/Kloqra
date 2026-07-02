export type AssignWorkspaceAdminFieldErrors = {
  email?: string;
  name?: string;
};

export function validateAssignWorkspaceAdminForm(
  email: string,
  name: string
): AssignWorkspaceAdminFieldErrors {
  const fieldErrors: AssignWorkspaceAdminFieldErrors = {};
  if (!email.trim()) fieldErrors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    fieldErrors.email = "Email must be valid.";
  }
  if (!name.trim()) fieldErrors.name = "Name is required.";
  return fieldErrors;
}
