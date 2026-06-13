import { render, screen } from "@testing-library/react";
import { Button } from "./button.js";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("applies disabled state", () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("applies size classes", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button", { name: "Small" })).toHaveClass("h-8");
  });
});
