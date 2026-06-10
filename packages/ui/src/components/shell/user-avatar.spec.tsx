import { render, screen } from "@testing-library/react";
import { UserAvatar } from "./user-avatar.js";

describe("UserAvatar", () => {
  it("renders initials for the user name", () => {
    render(<UserAvatar name="Sarah Johnson" />);
    expect(screen.getByText("SJ")).toBeInTheDocument();
  });
});
