/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandMark } from "./brand-mark";

describe("BrandMark", () => {
  it("renders timer icon in primary container", () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector(".bg-primary")).toBeTruthy();
  });

  it("shows wordmark and subtitle when requested", () => {
    render(<BrandMark showWordmark subtitle="Admin console" />);
    expect(screen.getByText("Kloqra")).toBeTruthy();
    expect(screen.getByText("Admin console")).toBeTruthy();
  });
});
