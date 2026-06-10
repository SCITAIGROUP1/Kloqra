import { fireEvent, render, screen } from "@testing-library/react";
import { SidebarUserFooter } from "./sidebar-user-footer.js";

describe("SidebarUserFooter", () => {
  it("renders profile link and logout in expanded mode", () => {
    const onLogout = vi.fn();
    render(
      <SidebarUserFooter userName="Sarah Johnson" profileHref="/settings" onLogout={onLogout} />
    );

    expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
    expect(screen.getByText("View Profile")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sarah Johnson/i })).toHaveAttribute(
      "href",
      "/settings"
    );

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("renders compact avatar and logout in collapsed mode", () => {
    const onLogout = vi.fn();
    render(
      <SidebarUserFooter
        collapsed
        userName="Sarah Johnson"
        profileHref="/settings"
        onLogout={onLogout}
      />
    );

    expect(screen.getByRole("link", { name: "Sarah Johnson" })).toHaveTextContent("SJ");
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
