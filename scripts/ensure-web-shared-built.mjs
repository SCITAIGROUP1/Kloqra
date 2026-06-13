#!/usr/bin/env node
/**
 * Build @kloqra/web-shared when dist is missing (exports resolve to dist/*.js).
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distIndex = path.join(root, "packages/web-shared/dist/index.js");

if (existsSync(distIndex)) {
  process.exit(0);
}

execFileSync(
  "bash",
  [path.join(root, "scripts/pnpm-wrap.sh"), "--filter", "@kloqra/web-shared", "build"],
  {
    stdio: "inherit",
    cwd: root
  }
);
