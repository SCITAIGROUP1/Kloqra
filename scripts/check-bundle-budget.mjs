#!/usr/bin/env node
/**
 * Fail if client dashboard first-load JS (uncompressed on-disk chunks) exceeds budget.
 * Run after: pnpm --filter @kloqra/client exec next build
 *
 * Note: Next's build table "First Load JS" is a gzip estimate; this gate sums raw .js chunks
 * for the dashboard route (page + layout). Default ~1.45 MB raw ≈ 400 KB transferred.
 *
 * Override budget: BUNDLE_BUDGET_DASHBOARD_BYTES=1500000 node scripts/check-bundle-budget.mjs
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const CLIENT_NEXT = join(ROOT, "apps/client/.next");
const MANIFEST_PATH = join(CLIENT_NEXT, "app-build-manifest.json");
const BUDGET_BYTES = Number(process.env.BUNDLE_BUDGET_DASHBOARD_BYTES ?? 1_450_000);

function chunkSize(relativePath) {
  const absolute = join(CLIENT_NEXT, relativePath);
  if (!existsSync(absolute)) {
    return 0;
  }
  return statSync(absolute).size;
}

function main() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`Missing ${MANIFEST_PATH}. Run client production build first.`);
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const pageKeys = Object.keys(manifest.pages ?? {}).filter((key) =>
    key.endsWith("/dashboard/page")
  );

  if (pageKeys.length === 0) {
    console.error("Could not find dashboard page in app-build-manifest.json");
    process.exit(1);
  }

  const pageKey = pageKeys[0];
  const layoutKey = pageKey.replace(/\/page$/, "/layout");
  const routeKeys = [pageKey, layoutKey].filter((key) => manifest.pages[key]);

  const chunks = new Set();
  for (const key of routeKeys) {
    for (const chunk of manifest.pages[key] ?? []) {
      if (chunk.endsWith(".js")) {
        chunks.add(chunk);
      }
    }
  }

  let totalBytes = 0;
  for (const chunk of chunks) {
    totalBytes += chunkSize(chunk);
  }

  const totalKb = Math.round(totalBytes / 1024);
  const budgetKb = Math.round(BUDGET_BYTES / 1024);

  if (totalBytes > BUDGET_BYTES) {
    console.error(
      `Bundle budget exceeded for dashboard: ${totalKb} KB raw JS > ${budgetKb} KB (${pageKey})`
    );
    process.exit(1);
  }

  console.log(
    `Bundle budget OK for dashboard: ${totalKb} KB raw JS / ${budgetKb} KB (${pageKey}, ${chunks.size} chunks)`
  );
}

main();
