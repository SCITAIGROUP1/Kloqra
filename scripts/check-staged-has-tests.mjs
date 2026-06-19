#!/usr/bin/env node
/**
 * Pre-commit gate: staged production code must include matching test changes.
 * Bypass for emergencies: SKIP_TEST_CHECK=1 git commit ...
 */
import { execSync } from "node:child_process";

if (process.env.SKIP_TEST_CHECK === "1") {
  process.exit(0);
}

const staged = execSync("git diff --cached --name-only", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const errors = [];

function stagedInModule(module) {
  return staged.some(
    (f) =>
      f.startsWith(`apps/api/src/modules/${module}/`) &&
      (f.endsWith(".spec.ts") || f.includes("/test/"))
  );
}

function stagedApiE2e() {
  return staged.some((f) => f.startsWith("apps/api/test/") && f.endsWith(".e2e.ts"));
}

for (const file of staged) {
  const apiApp = file.match(/^apps\/api\/src\/modules\/([^/]+)\/application\/(.+)\.ts$/);
  if (apiApp && !apiApp[2].endsWith(".spec")) {
    const module = apiApp[1];
    if (!stagedInModule(module) && !stagedApiE2e()) {
      errors.push(
        `API module "${module}": application code changed without staged tests (add ${module}/*.spec.ts or apps/api/test/*.e2e.ts)`
      );
    }
  }

  const apiController = file.match(/^apps\/api\/src\/modules\/([^/]+)\/interface\/.*\.ts$/);
  if (apiController && !file.endsWith(".spec.ts")) {
    const module = apiController[1];
    if (!stagedInModule(module) && !stagedApiE2e()) {
      errors.push(
        `API module "${module}": HTTP layer changed without staged tests in the same module`
      );
    }
  }
}

const contractsSkip = new Set([
  "packages/contracts/src/index.ts",
  "packages/contracts/src/routes.ts"
]);

const contractsProduction = staged.filter(
  (f) =>
    f.startsWith("packages/contracts/src/") &&
    f.endsWith(".ts") &&
    !f.endsWith(".spec.ts") &&
    !contractsSkip.has(f)
);

if (contractsProduction.length > 0) {
  const hasContractSpec = staged.some(
    (f) => f.startsWith("packages/contracts/src/") && f.endsWith(".spec.ts")
  );
  if (!hasContractSpec) {
    errors.push("packages/contracts: contract source changed without staged *.spec.ts");
  }
}

for (const file of staged) {
  const uiMatch = file.match(/^packages\/ui\/src\/(.+)\.tsx$/);
  if (uiMatch && !uiMatch[1].endsWith(".spec")) {
    const specPath = `packages/ui/src/${uiMatch[1]}.spec.tsx`;
    if (!staged.includes(specPath)) {
      errors.push(`packages/ui: ${file} changed without staging ${specPath}`);
    }
  }
}

for (const file of staged) {
  const featureMatch = file.match(/^apps\/(admin|client)\/src\/features\/.+\.tsx$/);
  if (featureMatch) {
    const app = featureMatch[1];
    const hasE2e = staged.some((f) => f.startsWith(`apps/${app}/e2e/`));
    const hasUnit = staged.some(
      (f) => f.startsWith(`apps/${app}/src/`) && (f.endsWith(".spec.ts") || f.endsWith(".spec.tsx"))
    );
    if (!hasE2e && !hasUnit) {
      errors.push(
        `apps/${app}: feature UI changed without staged e2e (apps/${app}/e2e/) or unit spec`
      );
    }
  }
}

if (errors.length > 0) {
  process.stderr.write("\nTest coverage pre-commit check failed. Add or stage matching tests:\n\n");
  for (const err of errors) {
    process.stderr.write(`  • ${err}\n`);
  }
  process.stderr.write("\nEmergency bypass: SKIP_TEST_CHECK=1 git commit ...\n");
  process.exit(1);
}
