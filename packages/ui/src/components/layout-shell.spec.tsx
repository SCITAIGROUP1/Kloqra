import { render, screen, waitFor } from "@testing-library/react";
import { Home } from "lucide-react";
import type { ReactNode } from "react";
import { ResponsiveLayoutShell } from "./layout-shell.js";
import { AppBar } from "./shell/app-bar.js";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname
}));

describe("ResponsiveLayoutShell", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
  });

  it("renders navigation and main content", () => {
    render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Footer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Workspace").length).toBeGreaterThan(0);
  });

  it("accepts structured shell toolbar parts", () => {
    render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
        shellToolbar={{
          search: <input aria-label="Global search" />,
          actions: <button type="button">Notify</button>
        }}
      >
        <AppBar title="Dashboard" />
      </ResponsiveLayoutShell>
    );

    expect(screen.getByRole("textbox", { name: "Global search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notify" })).toBeInTheDocument();
  });

  it("establishes a named shell container for responsive app bar layout", () => {
    const { container } = render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    const shellContainer = container.querySelector("[class*='@container/shell']");
    expect(shellContainer).toBeTruthy();
  });

  it("uses consistent vertical spacing in the collapsed sidebar scroll region", async () => {
    localStorage.setItem("kloqra-sidebar-collapsed", "true");

    const { container } = render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    await waitFor(() => {
      const scrollRegion = container.querySelector("aside.hidden.md\\:flex > div");
      expect(scrollRegion?.className).toContain("gap-5");
    });

    localStorage.removeItem("kloqra-sidebar-collapsed");
  });

  it("auto-collapses the sidebar on compact laptop viewports when no preference is saved", async () => {
    localStorage.removeItem("kloqra-sidebar-collapsed");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1366 });

    const { container } = render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    await waitFor(() => {
      const aside = container.querySelector("aside.hidden.md\\:flex");
      expect(aside?.className).toContain("w-[5rem]");
    });
  });

  it("uses a single scroll container in the shell root", () => {
    const { container } = render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    const root = container.firstElementChild;
    expect(root?.className).toContain("h-dvh");
    expect(root?.className).toContain("overflow-hidden");
  });

  it("renders a compact count badge on nav icons when the sidebar is collapsed", async () => {
    localStorage.setItem("kloqra-sidebar-collapsed", "true");

    const { container } = render(
      <ResponsiveLayoutShell
        navItems={[
          { href: "/dashboard", label: "Dashboard", Icon: Home },
          { href: "/approvals", label: "Approvals", Icon: Home, badge: 3 }
        ]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    await waitFor(() => {
      const badge = Array.from(container.querySelectorAll("[aria-hidden]")).find(
        (el) => el.textContent === "3"
      );
      expect(badge?.className).toContain("size-3");
      expect(badge?.className).toContain("text-[7px]");
    });

    localStorage.removeItem("kloqra-sidebar-collapsed");
  });

  it("renders optional nav section label", () => {
    render(
      <ResponsiveLayoutShell
        navItems={[{ href: "/dashboard", label: "Dashboard", Icon: Home }]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Switcher</div>}
        footerContent={() => <div>Footer</div>}
        navSectionLabel="Workspace"
        navAriaLabel="Workspace navigation"
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    expect(screen.getAllByText("Workspace").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("navigation", { name: "Workspace navigation" }).length
    ).toBeGreaterThan(0);
  });

  it("marks only the most specific account nav item active", () => {
    mockPathname = "/account/organization";

    render(
      <ResponsiveLayoutShell
        navItems={[
          { href: "/account", label: "Overview", Icon: Home },
          { href: "/account/organization", label: "Organization", Icon: Home }
        ]}
        logoIcon={<span>K</span>}
        logoTitle="Kloqra"
        logoSubtitle="Admin"
        logoLinkHref="/dashboard"
        workspaceSwitcher={() => <div>Workspace</div>}
        footerContent={() => <div>Footer</div>}
      >
        <div>Page content</div>
      </ResponsiveLayoutShell>
    );

    expect(screen.getAllByRole("link", { name: "Overview" })[0]).not.toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getAllByRole("link", { name: "Organization" })[0]).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
