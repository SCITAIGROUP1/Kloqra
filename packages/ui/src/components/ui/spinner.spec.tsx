import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CenteredLoader, LoadingCrossfade, Spinner } from "./spinner.js";

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

describe("LoadingCrossfade", () => {
  it("shows loader while loading", () => {
    render(
      <LoadingCrossfade loading loaderLabel="Loading…">
        <p>Content</p>
      </LoadingCrossfade>
    );
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows children when not loading", () => {
    render(
      <LoadingCrossfade loading={false}>
        <p>Content</p>
      </LoadingCrossfade>
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
