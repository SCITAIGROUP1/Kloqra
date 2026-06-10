#!/usr/bin/env node
/**
 * Reminds local devs that browser e2e needs a seeded DB (and usually the API).
 * Playwright webServer can start the API; seed remains a manual step unless CI.
 */
const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api/docs";

async function apiReachable() {
  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(3000) });
    return res.ok || res.status === 401;
  } catch {
    return false;
  }
}

const ok = await apiReachable();
if (!ok) {
  process.stderr.write(`
Browser e2e needs a seeded database. Before Playwright:

  pnpm prisma:seed
  pnpm --filter @kloqra/api dev   # :3001 (Playwright may start this for you)

Or run the full stack: pnpm dev

`);
  if (process.env.STRICT_E2E_PREP === "1") {
    process.exit(1);
  }
}
