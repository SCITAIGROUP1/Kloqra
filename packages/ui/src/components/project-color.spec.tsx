import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectColorPicker } from "./project-color.js";

const COLORS = ["#236bfe", "#00c9a7", "#ef4444"] as const;

describe("ProjectColorPicker", () => {
  it("renders palette and updates selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ProjectColorPicker value="#236bfe" onChange={onChange} colors={COLORS} />);

    expect(screen.getByRole("radiogroup", { name: "Project color" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Set color to #00c9a7/i }));
    expect(onChange).toHaveBeenCalledWith("#00c9a7");
  });
});
