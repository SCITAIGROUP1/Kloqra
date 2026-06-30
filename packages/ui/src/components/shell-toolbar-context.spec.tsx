import { render, screen } from "@testing-library/react";
import {
  isShellToolbarParts,
  resolveShellToolbar,
  ShellToolbarProvider,
  useShellToolbar
} from "./shell-toolbar-context.js";

function ToolbarReader() {
  const toolbar = useShellToolbar();
  return <div data-testid="toolbar">{JSON.stringify(Boolean(toolbar))}</div>;
}

describe("ShellToolbarProvider", () => {
  it("provides toolbar content to descendants", () => {
    render(
      <ShellToolbarProvider toolbar={<span>Actions</span>}>
        <ToolbarReader />
      </ShellToolbarProvider>
    );
    expect(screen.getByTestId("toolbar")).toHaveTextContent("true");
  });

  it("detects structured toolbar parts", () => {
    expect(isShellToolbarParts({ search: <span />, actions: <span /> })).toBe(true);
    expect(isShellToolbarParts(<span>Actions</span>)).toBe(false);
  });

  it("resolves structured toolbar into search and actions", () => {
    const resolved = resolveShellToolbar({
      search: <span>Search</span>,
      actions: <span>Actions</span>
    });

    expect(resolved.legacy).toBe(false);
    expect(resolved.search).toBeTruthy();
    expect(resolved.actions).toBeTruthy();
  });

  it("treats legacy toolbar as actions only", () => {
    const node = <span>Actions</span>;
    const resolved = resolveShellToolbar(node);

    expect(resolved.legacy).toBe(true);
    expect(resolved.search).toBeNull();
    expect(resolved.actions).toBe(node);
  });
});
