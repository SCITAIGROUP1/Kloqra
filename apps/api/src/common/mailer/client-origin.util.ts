export function clientOrigin(): string {
  const raw = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  return raw.split(",")[0]?.trim() || "http://localhost:3000";
}
