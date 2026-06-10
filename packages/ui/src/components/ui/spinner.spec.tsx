import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CenteredLoader, Spinner } from "./spinner.js";

describe("Spinner", () => {
  it("renders optional label", () => {
    render(<Spinner label="Loading data…" />);
    expect(screen.getByText("Loading data…")).toBeInTheDocument();
  });
});

describe("CenteredLoader", () => {
  it("renders centered loading message", () => {
    render(<CenteredLoader label="Loading table…" />);
    expect(screen.getByText("Loading table…")).toBeInTheDocument();
  });
});
