/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopyableValue } from "./copyable-value";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe("CopyableValue", () => {
  it("renders value and copies to clipboard", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<CopyableValue label="Organization ID" value="kloqra-demo" testId="copy-org" />);

    expect(screen.getByText("kloqra-demo")).toBeTruthy();
    fireEvent.click(screen.getByTestId("copy-org"));
    expect(writeText).toHaveBeenCalledWith("kloqra-demo");
  });
});
