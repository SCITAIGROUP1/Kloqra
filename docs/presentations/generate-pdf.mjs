#!/usr/bin/env node
/**
 * Generate PDF from kloqra-demo-and-roadmap.html using Playwright.
 * Run from repo root: node docs/presentations/generate-pdf.mjs
 */
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, "../../apps/client/package.json"));
const { chromium } = require("@playwright/test");

const htmlPath = path.join(__dirname, "kloqra-demo-and-roadmap.html");
const pdfPath = path.join(__dirname, "kloqra-demo-and-roadmap.pdf");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
await page.pdf({
  path: pdfPath,
  format: "A4",
  landscape: true,
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" }
});
await browser.close();
