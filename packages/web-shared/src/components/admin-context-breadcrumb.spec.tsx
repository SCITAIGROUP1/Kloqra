/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminContextBreadcrumb } from "./admin-context-breadcrumb";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("../stores/session.store", () => ({
  useSessionStore: (selector: (state: { session: Record<string, unknown> | null }) => unknown) =>
    selector({
      session: {
        tenantRole: "OWNER",
        workspaceRole: "ADMIN",
        workspaceName: "Acme Corporation",
        managedProjectIds: []
      }
    })
}));

vi.mock("../features/tenant/use-tenant-current", () => ({
  useTenantCurrent: () => ({
    tenant: { name: "Kloqra Demo Organization", slug: "kloqra-demo", status: "active" },
    loading: false,
    error: null,
    reload: vi.fn()
  })
}));

describe("AdminContextBreadcrumb", () => {
  it("renders organization breadcrumb in account mode", () => {
    render(<AdminContextBreadcrumb contextMode="account" />);

    expect(screen.getByRole("navigation", { name: "Current context" })).toBeTruthy();
    expect(screen.getByText("Kloqra Demo Organization")).toBeTruthy();
    expect(screen.getByText("Organization")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Kloqra Demo Organization" }).getAttribute("href")
    ).toBe("/account");
  });

  it("renders tenant, workspace, and access in workspace mode", () => {
    render(<AdminContextBreadcrumb contextMode="workspace" />);

    expect(screen.getByText("Acme Corporation")).toBeTruthy();
    expect(screen.getByText("Owner · Workspace admin")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Acme Corporation" }).getAttribute("href")).toBe(
      "/dashboard"
    );
  });
});
