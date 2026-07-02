/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PlatformContextBreadcrumb } from "./platform-context-breadcrumb";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe("PlatformContextBreadcrumb", () => {
  it("renders console breadcrumb", () => {
    render(<PlatformContextBreadcrumb contextMode="console" />);
    expect(screen.getByRole("navigation", { name: "Current context" })).toBeTruthy();
    expect(screen.getByText("Kloqra")).toBeTruthy();
    expect(screen.getByText("Console")).toBeTruthy();
  });

  it("renders account breadcrumb with console link", () => {
    render(<PlatformContextBreadcrumb contextMode="account" />);
    expect(screen.getByRole("link", { name: "Kloqra" }).getAttribute("href")).toBe("/tenants");
    expect(screen.getByText("Account")).toBeTruthy();
  });
});
