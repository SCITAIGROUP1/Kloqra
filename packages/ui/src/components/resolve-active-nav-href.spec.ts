import { describe, expect, it } from "vitest";
import { resolveActiveNavHref } from "./resolve-active-nav-href.js";

const ACCOUNT_NAV = [
  "/account",
  "/account/workspaces",
  "/account/organization",
  "/account/billing",
  "/account/data-privacy"
] as const;

describe("resolveActiveNavHref", () => {
  it("prefers exact match on overview", () => {
    expect(resolveActiveNavHref("/account", ACCOUNT_NAV)).toBe("/account");
  });

  it("does not mark overview active on nested account routes", () => {
    expect(resolveActiveNavHref("/account/organization", ACCOUNT_NAV)).toBe(
      "/account/organization"
    );
    expect(resolveActiveNavHref("/account/billing", ACCOUNT_NAV)).toBe("/account/billing");
  });

  it("picks the longest prefix when paths nest", () => {
    const nav = ["/projects", "/projects/settings"] as const;
    expect(resolveActiveNavHref("/projects/settings/members", nav)).toBe("/projects/settings");
    expect(resolveActiveNavHref("/projects", nav)).toBe("/projects");
  });

  it("returns null when no nav item matches", () => {
    expect(resolveActiveNavHref("/unknown", ACCOUNT_NAV)).toBeNull();
  });
});
