import { render, screen } from "@testing-library/react";
import { AssigneeAvatarStack } from "./assignee-avatar-stack.js";

describe("AssigneeAvatarStack", () => {
  const members = [
    { userId: "1", userName: "Avery Admin" },
    { userId: "2", userName: "Morgan Blake" },
    { userId: "3", userName: "Drew Martinez" },
    { userId: "4", userName: "Sage Patel" },
    { userId: "5", userName: "Blake Wilson" }
  ];

  it("renders initials for the first three members", () => {
    render(<AssigneeAvatarStack members={members} />);
    expect(screen.getByText("AA")).toBeInTheDocument();
    expect(screen.getByText("MB")).toBeInTheDocument();
    expect(screen.getByText("DM")).toBeInTheDocument();
  });

  it("shows overflow count when more than three members", () => {
    render(<AssigneeAvatarStack members={members} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByLabelText(/2 more: Sage Patel, Blake Wilson/)).toBeInTheDocument();
  });

  it("renders nothing when there are no members", () => {
    const { container } = render(<AssigneeAvatarStack members={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
