import { BRAND_PROJECT_COLORS } from "./brand";

/** Curated palette — distinct on light and dark backgrounds */
export const PROJECT_COLORS = BRAND_PROJECT_COLORS;

export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0];

export function pickDefaultProjectColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length]!;
}

export function normalizeProjectColor(color: string): string {
  return color.trim().toLowerCase();
}

export function projectColorsMatch(a: string, b: string): boolean {
  return normalizeProjectColor(a) === normalizeProjectColor(b);
}
