/** @vitest-environment jsdom */
import { BRAND_SUBTAGLINE, BRAND_TAGLINE } from "@kloqra/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthShell } from "./auth-shell";

describe("AuthShell", () => {
  it("renders title, children, footer, and portal label", () => {
    render(
      <AuthShell
        title="Sign in"
        portalLabel="Member Portal"
        description="Enter your email and password to access your account."
        footer={<p>Need help?</p>}
      >
        <button type="submit">Submit</button>
      </AuthShell>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeTruthy();
    expect(screen.getByText("Enter your email and password to access your account.")).toBeTruthy();
    expect(screen.getByText("Member Portal")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit" })).toBeTruthy();
    expect(screen.getByText("Need help?")).toBeTruthy();
    expect(screen.getByText(/Copyright © \d{4} Kloqra/)).toBeTruthy();
  });

  it("renders brand mark and hero panel with marketing copy", () => {
    const { container } = render(
      <AuthShell title="Forgot password">
        <p>Reset form</p>
      </AuthShell>
    );

    expect(screen.getByText("Kloqra")).toBeTruthy();
    expect(container.querySelector("aside.bg-primary h2")?.textContent).toBe(BRAND_TAGLINE);
    expect(screen.getAllByText(BRAND_SUBTAGLINE).length).toBeGreaterThan(0);
    expect(screen.getByText("Reset form")).toBeTruthy();
    expect(container.querySelector("aside.bg-primary")).toBeTruthy();
  });

  it("wraps auth content in an enclosed rounded container", () => {
    const { container } = render(
      <AuthShell title="Sign in">
        <p>Form</p>
      </AuthShell>
    );

    const enclosure = container.querySelector(".rounded-xl.border-border.overflow-hidden");
    expect(enclosure).toBeTruthy();
    expect(enclosure?.querySelector("aside.bg-primary")).toBeTruthy();
  });

  it("uses responsive layout classes for mobile through desktop", () => {
    const { container } = render(
      <AuthShell title="Sign in">
        <p>Form</p>
      </AuthShell>
    );

    const enclosure = container.querySelector(".rounded-xl.border-border.overflow-hidden");
    expect(enclosure?.className).toContain("lg:grid-cols-2");
    expect(enclosure?.className).toContain("sm:max-w-lg");
    expect(enclosure?.className).toContain("lg:max-w-4xl");

    const hero = container.querySelector("aside.bg-primary");
    expect(hero?.className).toContain("border-t");
    expect(hero?.className).toContain("lg:border-t-0");
  });

  it("hides the product preview on the smallest screens", () => {
    const { container } = render(
      <AuthShell title="Sign in">
        <p>Form</p>
      </AuthShell>
    );

    const preview = container.querySelector("[data-slot='card'].hidden.sm\\:block");
    expect(preview).toBeTruthy();
  });
});
