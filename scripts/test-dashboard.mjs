#!/usr/bin/env node
/**
 * Local test hub — browse coverage HTML, Playwright reports, and launch commands.
 * Usage: pnpm test:dashboard [--open]
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.TEST_DASHBOARD_PORT ?? 9321);
const OPEN = process.argv.includes("--open");

const REPORT_PATHS = {
  "api-coverage": "apps/api/coverage/index.html",
  "contracts-coverage": "packages/contracts/coverage/index.html",
  "ui-coverage": "packages/ui/coverage/index.html",
  "admin-playwright": "apps/admin/playwright-report/index.html",
  "client-playwright": "apps/client/playwright-report/index.html",
  "api-junit": "apps/api/test-results/unit-junit.xml",
  "api-e2e-junit": "apps/api/test-results/e2e-junit.xml"
};

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function pct(summaryPath) {
  if (!exists(summaryPath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, summaryPath), "utf8"));
    const total = data.total;
    if (!total) return null;
    return {
      lines: total.lines?.pct ?? 0,
      statements: total.statements?.pct ?? 0,
      branches: total.branches?.pct ?? 0
    };
  } catch {
    return null;
  }
}

function statusBadge(rel) {
  return exists(rel)
    ? '<span class="badge ok">ready</span>'
    : '<span class="badge missing">not generated</span>';
}

function coverageCard(title, summaryRel, htmlRel) {
  const stats = pct(summaryRel);
  const statsHtml = stats
    ? `<p class="stats">Lines ${stats.lines}% · Statements ${stats.statements}% · Branches ${stats.branches}%</p>`
    : `<p class="muted">Run <code>pnpm test:coverage</code> to generate.</p>`;
  const link = exists(htmlRel)
    ? `<a href="/${htmlRel}">Open HTML report</a>`
    : `<span class="muted">HTML report not found</span>`;
  return `<article class="card">
    <h2>${title} ${statusBadge(htmlRel)}</h2>
    ${statsHtml}
    <p>${link}</p>
  </article>`;
}

function buildHtml() {
  const apiCov = coverageCard(
    "API coverage",
    "apps/api/coverage/coverage-summary.json",
    REPORT_PATHS["api-coverage"]
  );
  const contractsCov = coverageCard(
    "Contracts coverage",
    "packages/contracts/coverage/coverage-summary.json",
    REPORT_PATHS["contracts-coverage"]
  );
  const uiCov = coverageCard(
    "UI package coverage",
    "packages/ui/coverage/coverage-summary.json",
    REPORT_PATHS["ui-coverage"]
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Kloqra Test Hub</title>
  <style>
    :root { font-family: system-ui, sans-serif; color: #0f172a; background: #f8fafc; }
    body { margin: 0; padding: 2rem; max-width: 960px; }
    h1 { margin-top: 0; }
    .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem 1.25rem; }
    .card h2 { margin: 0 0 0.5rem; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem; }
    .badge { font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 999px; font-weight: 600; text-transform: uppercase; }
    .badge.ok { background: #dcfce7; color: #166534; }
    .badge.missing { background: #fee2e2; color: #991b1b; }
    .stats { margin: 0.25rem 0; font-size: 0.9rem; }
    .muted { color: #64748b; font-size: 0.9rem; }
    code { background: #f1f5f9; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.85rem; }
    a { color: #2563eb; }
    ul.commands { line-height: 1.8; }
    section { margin-top: 2rem; }
  </style>
</head>
<body>
  <h1>Kloqra Test Hub</h1>
  <p>Local dashboard for coverage and browser test reports — similar to Swagger for the API, but for test artifacts.</p>

  <section class="grid">
    ${apiCov}
    ${contractsCov}
    ${uiCov}
    <article class="card">
      <h2>Admin Playwright ${statusBadge(REPORT_PATHS["admin-playwright"])}</h2>
      <p class="muted">Requires API on :3001 and seeded DB before e2e.</p>
      <p>${exists(REPORT_PATHS["admin-playwright"]) ? `<a href="/${REPORT_PATHS["admin-playwright"]}">Open HTML report</a>` : "Run <code>pnpm --filter @kloqra/admin test:e2e</code>"}</p>
    </article>
    <article class="card">
      <h2>Client Playwright ${statusBadge(REPORT_PATHS["client-playwright"])}</h2>
      <p>${exists(REPORT_PATHS["client-playwright"]) ? `<a href="/${REPORT_PATHS["client-playwright"]}">Open HTML report</a>` : "Run <code>pnpm --filter @kloqra/client test:e2e</code>"}</p>
    </article>
    <article class="card">
      <h2>API docs (Swagger)</h2>
      <p class="muted">Start the API with <code>pnpm --filter @kloqra/api dev</code></p>
      <p><a href="http://localhost:3001/api/docs" target="_blank" rel="noreferrer">Open Swagger UI</a></p>
    </article>
  </section>

  <section>
    <h2>Interactive runners (terminal)</h2>
    <ul class="commands">
      <li><code>pnpm test:ui</code> — Vitest UI (API unit tests)</li>
      <li><code>pnpm --filter @kloqra/admin test:e2e:ui</code> — Playwright UI (admin)</li>
      <li><code>pnpm --filter @kloqra/client test:e2e:ui</code> — Playwright UI (client)</li>
      <li><code>pnpm test:coverage</code> — refresh coverage HTML linked above</li>
      <li><code>pnpm test:integration</code> — API Supertest e2e</li>
    </ul>
  </section>
</body>
</html>`;
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".xml")) return "application/xml; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  if (decoded === "/" || decoded === "/index.html") return null;
  const normalized = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = path.join(ROOT, normalized);
  if (!abs.startsWith(ROOT)) return undefined;
  return abs;
}

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(buildHtml());
    return;
  }

  const abs = safePath(req.url ?? "/");
  if (abs === undefined) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  if (abs === null) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(buildHtml());
    return;
  }

  fs.stat(abs, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType(abs) });
    fs.createReadStream(abs).pipe(res);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  process.stdout.write(`Test hub running at ${url}\n`);
  process.stdout.write("Press Ctrl+C to stop.\n");
  if (OPEN) {
    const opener =
      process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    spawn(opener, [url], { stdio: "ignore", detached: true }).unref();
  }
});
