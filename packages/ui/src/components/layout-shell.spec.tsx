import { render, screen } from "@testing-library/react";
import { Home } from "lucide-react";
import type { ReactNode } from "react";
import { ResponsiveLayoutShell } from "./layout-shell.js";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard"
}));

describe("ResponsiveLayoutShell", () => {
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
  });
});
