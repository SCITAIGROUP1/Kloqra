import { describe, expect, it, vi } from "vitest";
import {
  HARD_AUTO_STOP_HOURS,
  parseWorkspaceSettings,
  resolveEffectiveCurrency,
  resolveEffectiveTimerStaleWarningHours
} from "./workspace-settings";
import { DEFAULT_CURRENCY, DEFAULT_HARD_AUTO_STOP_HOURS, TimerSource } from "./index";

describe("workspace-settings", () => {
  it("parses optional currency from workspace settings", () => {
    const settings = parseWorkspaceSettings({ currency: "EUR" });
    expect(settings.currency).toBe("EUR");
    expect(resolveEffectiveCurrency(settings)).toBe("EUR");
  });

  it("falls back to USD when currency is missing or invalid", () => {
    expect(resolveEffectiveCurrency(parseWorkspaceSettings({}))).toBe(DEFAULT_CURRENCY);
    expect(resolveEffectiveCurrency(parseWorkspaceSettings({ currency: "usd" }))).toBe(
      DEFAULT_CURRENCY
    );
  });

  it("resolves timer stale warning hours with default fallback", () => {
    expect(resolveEffectiveTimerStaleWarningHours({})).toBe(8);
    expect(resolveEffectiveTimerStaleWarningHours({ timerStaleWarningHours: 6 })).toBe(6);
  });

  it("exposes HARD_AUTO_STOP_HOURS with a positive default", () => {
    expect(HARD_AUTO_STOP_HOURS).toBeGreaterThan(0);
    expect(DEFAULT_HARD_AUTO_STOP_HOURS).toBe(8);
  });

  it("reads NEXT_PUBLIC_HARD_AUTO_STOP_HOURS when set", async () => {
    const prior = process.env.NEXT_PUBLIC_HARD_AUTO_STOP_HOURS;
    process.env.NEXT_PUBLIC_HARD_AUTO_STOP_HOURS = "10";
    vi.resetModules();
    const { HARD_AUTO_STOP_HOURS: hours } = await import("./workspace-settings");
    expect(hours).toBe(10);
    if (prior === undefined) {
      delete process.env.NEXT_PUBLIC_HARD_AUTO_STOP_HOURS;
    } else {
      process.env.NEXT_PUBLIC_HARD_AUTO_STOP_HOURS = prior;
    }
    vi.resetModules();
  });

  it("exports timer source constants", () => {
    expect(TimerSource.timerAutostopped).toBe("timer_autostopped");
  });
});
