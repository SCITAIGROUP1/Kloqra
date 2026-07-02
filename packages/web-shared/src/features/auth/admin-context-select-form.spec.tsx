/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminContextSelectForm } from "./admin-context-select-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams()
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("../../stores/session.store", () => ({
  useSessionStore: (selector: (state: { session: Record<string, unknown> | null }) => unknown) =>
    selector({
      session: {
        tenantRole: "OWNER",
        workspaceId: "ws-1",
        workspaceRole: "ADMIN"
      }
    })
}));

vi.mock("../tenant/use-tenant-current", () => ({
  useTenantCurrent: () => ({
    tenant: { name: "Kloqra Demo Organization", slug: "kloqra-demo", status: "active" },
    loading: false,
    error: null,
    reload: vi.fn()
  })
}));

vi.mock("../../api/client", () => ({
  api: vi.fn().mockResolvedValue([
    { id: "ws-1", name: "Acme Corporation", slug: "acme", role: "ADMIN" },
    { id: "ws-2", name: "Meridian Product Co", slug: "meridian", role: "ADMIN" }
  ])
}));

describe("AdminContextSelectForm", () => {
  it("shows organization and workspace sections for owners", async () => {
    render(<AdminContextSelectForm portalLabel="Admin Portal" />);

    expect(await screen.findByText("Choose how you want to work")).toBeTruthy();
    expect(screen.getByText("Organization")).toBeTruthy();
    expect(screen.getByText("Organization · Owner")).toBeTruthy();
    expect(screen.getByText("Workspaces")).toBeTruthy();
    expect(screen.getAllByText("Owner · Workspace admin").length).toBeGreaterThan(0);
  });
});
