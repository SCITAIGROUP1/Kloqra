import { render, screen } from "@testing-library/react";
import { UserAvatar } from "./user-avatar.js";

describe("UserAvatar", () => {
  it("renders initials for the user name", () => {
    render(<UserAvatar name="Sarah Johnson" />);
    expect(screen.getByText("SJ")).toBeInTheDocument();
  });

  it("prefers first and last name for initials", () => {
    render(<UserAvatar name="Sam Rivera" firstName="Sam" lastName="Rivera" />);
    expect(screen.getByText("SR")).toBeInTheDocument();
  });
});
