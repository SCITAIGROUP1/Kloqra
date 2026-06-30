export type InviteMemberFieldErrors = {
  email?: string;
  name?: string;
};

export function validateInviteMemberForm(email: string, name: string): InviteMemberFieldErrors {
  const fieldErrors: InviteMemberFieldErrors = {};
  const trimmedEmail = email.trim();
  const trimmedName = name.trim();

  if (!trimmedEmail) fieldErrors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    fieldErrors.email = "Email must be a valid email address.";
  }

  if (!trimmedName) fieldErrors.name = "Name is required.";

  return fieldErrors;
}
