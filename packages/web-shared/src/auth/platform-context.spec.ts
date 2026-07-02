import { describe, expect, it } from "vitest";
import { resolvePlatformContextBreadcrumb } from "./platform-context";

describe("resolvePlatformContextBreadcrumb", () => {
  it("returns console segments for platform console mode", () => {
    expect(resolvePlatformContextBreadcrumb({ contextMode: "console" })).toEqual([
      { label: "Kloqra" },
      { label: "Console" }
    ]);
  });

  it("returns account segments with console link in account mode", () => {
    expect(resolvePlatformContextBreadcrumb({ contextMode: "account" })).toEqual([
      { label: "Kloqra", href: "/tenants" },
      { label: "Account" }
    ]);
  });
});
