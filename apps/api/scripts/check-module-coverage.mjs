import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const summaryPath = join(apiRoot, "coverage/coverage-summary.json");
const floorsPath = join(apiRoot, "scripts/module-floors.json");

const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const config = JSON.parse(readFileSync(floorsPath, "utf8"));
const scope = config.scope ?? "application";

function moduleLines(moduleName) {
  let total = 0;
  let covered = 0;

  for (const [filePath, stats] of Object.entries(summary)) {
    if (filePath === "total") continue;
    const needle = `/modules/${moduleName}/${scope}/`;
    if (!filePath.includes(needle)) continue;
    total += stats.lines.total;
    covered += stats.lines.covered;
  }

  return {
    total,
    covered,
    pct: total > 0 ? (covered / total) * 100 : 0
  };
}

const failures = [];

for (const [moduleName, floor] of Object.entries(config.floors)) {
  const result = moduleLines(moduleName);
  const rounded = Math.round(result.pct * 10) / 10;
  const target = config.targets?.[moduleName];
  const targetNote = target ? ` (target ${target}%)` : "";

  if (result.total === 0) {
    failures.push(`${moduleName}: no files matched */${scope}/*`);
    continue;
  }

  process.stdout.write(`${moduleName} ${scope}: ${rounded}%${targetNote}\n`);
  if (rounded < floor) {
    failures.push(`${moduleName}: ${rounded}% < floor ${floor}%`);
  }
}

if (failures.length > 0) {
  process.stderr.write("\nModule coverage floors not met:\n");
  for (const failure of failures) {
    process.stderr.write(`  - ${failure}\n`);
  }
  process.exit(1);
}

process.stdout.write("\nAll module coverage floors passed.\n");
