export function getApiBase(): string {
  let raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
  if (raw && !/^https?:\/\//i.test(raw)) {
    raw = `https://${raw.replace(/^\/+/, "")}`;
  }
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    raw.startsWith("http://") &&
    !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(raw)
  ) {
    return raw.replace(/^http:/, "https:");
  }
  return raw;
}
