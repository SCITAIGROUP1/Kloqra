/** Tracks which user already had theme applied from API or a local choice. */
let hydratedUserId: string | null = null;

export function markThemeHydrated(userId: string) {
  hydratedUserId = userId;
}

export function shouldHydrateTheme(userId: string): boolean {
  return hydratedUserId !== userId;
}

export function clearThemeHydration() {
  hydratedUserId = null;
}
