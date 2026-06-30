export const THEME_STORAGE_PREFIX = "kloqra-theme";
const LEGACY_THEME_STORAGE_KEY = "theme";

export function themeStorageKey(userId?: string | null): string {
  return userId ? `${THEME_STORAGE_PREFIX}-${userId}` : `${THEME_STORAGE_PREFIX}-guest`;
}

/** Clears persisted next-themes keys so the next login hydrates from the API. */
export function clearStoredThemePreference(userId?: string | null): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  localStorage.removeItem(themeStorageKey(null));
  if (userId) {
    localStorage.removeItem(themeStorageKey(userId));
  }
}
