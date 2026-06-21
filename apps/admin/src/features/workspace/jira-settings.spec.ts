import { describe, expect, it } from "vitest";
import { extractAtlassianOrigin } from "./jira-url";

describe("Jira workspace settings — URL normalization", () => {
  it("extracts origin from a full Atlassian URL with path", () => {
    expect(
      extractAtlassianOrigin("https://acme.atlassian.net/jira/software/projects/PROJ/boards/1")
    ).toBe("https://acme.atlassian.net");
  });

  it("returns origin unchanged when URL has no path", () => {
    expect(extractAtlassianOrigin("https://acme.atlassian.net")).toBe("https://acme.atlassian.net");
  });

  it("trims whitespace before parsing", () => {
    expect(extractAtlassianOrigin("  https://acme.atlassian.net/browse/PROJ-1  ")).toBe(
      "https://acme.atlassian.net"
    );
  });

  it("returns trimmed input as-is for an invalid URL", () => {
    expect(extractAtlassianOrigin("  not-a-url  ")).toBe("not-a-url");
  });

  it("returns empty string for empty input", () => {
    expect(extractAtlassianOrigin("")).toBe("");
  });

  it("handles URL with port correctly", () => {
    expect(extractAtlassianOrigin("https://jira.internal.company.com:8080/browse/PROJ-1")).toBe(
      "https://jira.internal.company.com:8080"
    );
  });
});
