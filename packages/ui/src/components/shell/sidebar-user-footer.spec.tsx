import { fireEvent, render, screen } from "@testing-library/react";
import { SidebarUserFooter } from "./sidebar-user-footer.js";

describe("SidebarUserFooter", () => {
  it("renders profile link and logout", () => {
    const onLogout = vi.fn();
    render(
      <SidebarUserFooter userName="Sarah Johnson" profileHref="/settings" onLogout={onLogout} />
    );

    expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
