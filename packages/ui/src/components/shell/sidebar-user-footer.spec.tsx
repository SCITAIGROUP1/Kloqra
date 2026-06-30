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

  it("passes first and last name to the avatar", () => {
    render(
      <SidebarUserFooter
        userName="Sam Rivera"
        firstName="Sam"
        lastName="Rivera"
        profileHref="/profile"
        onLogout={() => {}}
      />
    );

    expect(screen.getByText("SR")).toBeInTheDocument();
  });
});
