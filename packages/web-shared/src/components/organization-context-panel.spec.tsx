/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { OrganizationContextPanel } from "./organization-context-panel";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("../stores/session.store", () => ({
  useSessionStore: (selector: (state: { session: { workspaceName: string } | null }) => unknown) =>
    selector({ session: { workspaceName: "Acme Corporation" } })
}));

vi.mock("../features/tenant/use-tenant-current", () => ({
  useTenantCurrent: () => ({
    tenant: { name: "Kloqra Demo Organization", slug: "kloqra-demo", status: "active" },
    loading: false,
    error: null,
    reload: vi.fn()
  })
}));

vi.mock("../features/tenant/use-tenant-overview", () => ({
  useTenantOverview: () => ({
    overview: {
      subscription: { planName: "Pro", status: "active" }
    },
    loading: false,
    error: null,
    reload: vi.fn()
  })
}));

describe("OrganizationContextPanel", () => {
  it("renders tenant name and back link to workspace", () => {
    render(<OrganizationContextPanel backHref="/dashboard" />);

    expect(screen.getByText("Kloqra Demo Organization")).toBeTruthy();
    expect(screen.getByText("Pro")).toBeTruthy();
    const back = screen.getByRole("link", { name: /back to acme corporation workspace/i });
    expect(back.getAttribute("href")).toBe("/dashboard");
  });

  it("renders collapsed initials trigger", () => {
    render(<OrganizationContextPanel collapsed />);
    expect(screen.getByRole("button", { name: "Kloqra Demo Organization" })).toBeTruthy();
  });
});
