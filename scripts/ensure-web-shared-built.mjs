#!/usr/bin/env node
/**
 * Build @kloqra/web-shared when dist is missing or older than src (exports resolve to dist/*.js).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgRoot = path.join(root, "packages/web-shared");
const distIndex = path.join(pkgRoot, "dist/index.js");
const srcRoot = path.join(pkgRoot, "src");
const pnpmWrap = path.join(root, "scripts/pnpm-wrap.sh");

function newestMtimeMs(dir) {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtimeMs(full));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith(".d.ts")) continue;
    newest = Math.max(newest, statSync(full).mtimeMs);
  }
  return newest;
}

function needsBuild() {
  if (!existsSync(distIndex)) return true;
  const distMtime = statSync(distIndex).mtimeMs;
  return newestMtimeMs(srcRoot) > distMtime;
}

if (!needsBuild()) {
  process.exit(0);
}

execFileSync("bash", [pnpmWrap, "--filter", "@kloqra/web-shared", "build"], {
  stdio: "inherit",
  cwd: root
});
