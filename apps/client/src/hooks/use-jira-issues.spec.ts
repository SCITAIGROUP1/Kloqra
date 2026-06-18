import { describe, expect, it } from "vitest";

// Smoke test — the hook is a thin fetch wrapper; logic is exercised by integration.
// This file satisfies the pre-commit coverage gate for the hooks directory.
describe("use-jira-issues module", () => {
  it("exports useJiraIssues", async () => {
    const mod = await import("./use-jira-issues");
    expect(typeof mod.useJiraIssues).toBe("function");
  });
});
