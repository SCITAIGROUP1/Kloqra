export function getUserInitials(name: string, max = 2) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, max)
    .toUpperCase();
}

/** Two letters from first + last name; falls back to word-based initials when last name is missing. */
export function getDisplayInitials(
  firstName?: string | null,
  lastName?: string | null,
  fallbackName?: string
): string {
  const first = firstName?.trim();
  const last = lastName?.trim();
  if (first && last) {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  }
  if (first) {
    return getUserInitials(first, 2);
  }
  return getUserInitials(fallbackName ?? "", 2);
}
