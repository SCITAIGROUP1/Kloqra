import { render, screen } from "@testing-library/react";
import { ShellToolbarProvider, useShellToolbar } from "./shell-toolbar-context.js";

function ToolbarReader() {
  const toolbar = useShellToolbar();
  return <div data-testid="toolbar">{toolbar}</div>;
}

describe("ShellToolbarProvider", () => {
  it("provides toolbar content to descendants", () => {
    render(
      <ShellToolbarProvider toolbar={<span>Actions</span>}>
        <ToolbarReader />
      </ShellToolbarProvider>
    );
    expect(screen.getByTestId("toolbar")).toHaveTextContent("Actions");
  });
});
