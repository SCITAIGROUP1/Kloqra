#!/usr/bin/env node
/**
 * Prepare local browser e2e: bootstrap Postgres/Redis, migrate, and seed when needed.
 * Playwright webServer starts app processes; this script prepares the database first.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bootstrapScript = path.join(root, "scripts/e2e-bootstrap.sh");

try {
  execFileSync("bash", [bootstrapScript], { stdio: "inherit", cwd: root });
} catch (error) {
  process.stderr.write("\nBrowser e2e bootstrap failed.\n");
  process.stderr.write("Ensure Docker is running or native Postgres is available, then retry.\n\n");
  if (process.env.STRICT_E2E_PREP === "1") {
    process.exit(1);
  }
  throw error;
}

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
Database bootstrap finished. Playwright will start the API on :3001 if it is not already running.

If e2e still fails, start the stack manually:
  pnpm dev:api
  pnpm dev:admin   # :3002
  pnpm dev:client  # :3000

`);
}
