export function extractAtlassianOrigin(url: string): string {
  try {
    return new URL(url.trim()).origin;
  } catch {
    return url.trim();
  }
}
