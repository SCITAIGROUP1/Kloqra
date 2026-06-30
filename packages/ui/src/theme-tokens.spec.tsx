import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const globalsPath = join(dirname(fileURLToPath(import.meta.url)), "globals.css");
const css = readFileSync(globalsPath, "utf8");

function extractBlock(selector: string): string {
  const match = css.match(new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]+)\\}`, "s"));
  return match?.[1] ?? "";
}

const STATUS_TOKENS = [
  "--status-success-bg",
  "--status-success-fg",
  "--status-success-border",
  "--status-warning-bg",
  "--status-warning-fg",
  "--status-warning-border",
  "--status-info-bg",
  "--status-info-fg",
  "--status-info-border",
  "--status-danger-bg",
  "--status-danger-fg",
  "--status-danger-border"
] as const;

describe("theme tokens", () => {
  it("defines status surface tokens in light and dark", () => {
    const light = extractBlock(":root");
    const dark = extractBlock(".dark");

    for (const token of STATUS_TOKENS) {
      expect(light, `light missing ${token}`).toContain(`${token}:`);
      expect(dark, `dark missing ${token}`).toContain(`${token}:`);
    }
  });

  it("wires status tokens into @theme inline", () => {
    for (const token of STATUS_TOKENS) {
      const themeKey = token.replace("--", "--color-");
      expect(css, `theme missing ${themeKey}`).toContain(`${themeKey}: var(${token});`);
    }
  });

  it("anchors dark neutrals on hue 264 with brand-aligned primary", () => {
    const dark = extractBlock(".dark");

    expect(dark).toContain("--background: oklch(0.14 0.025 264)");
    expect(dark).toContain("--card: oklch(0.28 0.035 264)");
    expect(dark).toContain("--primary: oklch(0.78 0.14 264)");
    expect(dark).toContain("--primary-foreground: oklch(0.14 0.025 264)");
  });

  it("differentiates dark muted, secondary, and accent surfaces", () => {
    const dark = extractBlock(".dark");
    const muted = dark.match(/--muted:\s*([^;]+)/)?.[1]?.trim();
    const secondary = dark.match(/--secondary:\s*([^;]+)/)?.[1]?.trim();
    const accent = dark.match(/--accent:\s*([^;]+)/)?.[1]?.trim();

    expect(muted).toBeTruthy();
    expect(secondary).toBeTruthy();
    expect(accent).toBeTruthy();
    expect(new Set([muted, secondary, accent]).size).toBe(3);
  });

  it("hides scrollbar chrome globally while keeping scroll", () => {
    expect(css).toContain("scrollbar-width: none");
    expect(css).toContain("html::-webkit-scrollbar");
    expect(css).toContain("display: none");
  });
});
