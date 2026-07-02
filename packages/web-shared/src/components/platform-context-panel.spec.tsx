/** @vitest-environment jsdom */
import { BRAND_NAME, PLATFORM_PORTAL_LABEL } from "@kloqra/contracts";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PlatformContextPanel } from "./platform-context-panel";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe("PlatformContextPanel", () => {
  it("renders platform console scope instead of staff profile", () => {
    render(<PlatformContextPanel />);
    expect(screen.getByText(BRAND_NAME)).toBeTruthy();
    expect(screen.getByText("Console")).toBeTruthy();
    expect(screen.getByText(PLATFORM_PORTAL_LABEL)).toBeTruthy();
  });

  it("shows back link on account routes", () => {
    render(<PlatformContextPanel showBackLink />);
    expect(screen.getByText("Account")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /back to platform console/i }).getAttribute("href")
    ).toBe("/tenants");
  });
});
