import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaggerItem, StaggerList } from "./stagger-list.js";

describe("StaggerList", () => {
  it("wraps children with staggered animation delays", () => {
    render(
      <StaggerList>
        <div>First</div>
        <div>Second</div>
      </StaggerList>
    );
    const first = screen.getByText("First");
    const second = screen.getByText("Second");
    expect(first.parentElement).toHaveClass("animate-fade-in");
    expect(first.parentElement).toHaveStyle({ animationDelay: "0ms" });
    expect(second.parentElement).toHaveStyle({ animationDelay: "25ms" });
  });
});

describe("StaggerItem", () => {
  it("caps delay at 300ms", () => {
    render(<StaggerItem index={20}>Late</StaggerItem>);
    expect(screen.getByText("Late")).toHaveStyle({ animationDelay: "100ms" });
  });

  it("merges forwarded layout styles from parents", () => {
    render(
      <StaggerItem index={1} style={{ transform: "translate(10px, 20px)", width: "320px" }}>
        Positioned
      </StaggerItem>
    );
    const el = screen.getByText("Positioned");
    expect(el).toHaveStyle({
      transform: "translate(10px, 20px)",
      width: "320px",
      animationDelay: "25ms"
    });
  });
});
