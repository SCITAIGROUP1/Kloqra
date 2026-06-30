import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemberProjectColorPicker } from "./member-project-color-picker.js";

const COLORS = ["#236bfe", "#00c9a7"] as const;

describe("MemberProjectColorPicker", () => {
  it("renders label and forwards color changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MemberProjectColorPicker value="#236bfe" onChange={onChange} colors={COLORS} />);

    expect(screen.getByText("Your color for this project")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Set color to #00c9a7/i }));
    expect(onChange).toHaveBeenCalledWith("#00c9a7");
  });

  it("shows reset action when onClear is provided", async () => {
    const onClear = vi.fn();
    render(
      <MemberProjectColorPicker
        value="#236bfe"
        onChange={() => {}}
        colors={COLORS}
        onClear={onClear}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Reset to project default" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("commits custom hex from the text field", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MemberProjectColorPicker value="#236bfe" onChange={onChange} colors={COLORS} />);

    const hexInput = screen.getByRole("textbox", { name: "Custom color hex" });
    await user.clear(hexInput);
    await user.type(hexInput, "#a1b2c3");
    await user.tab();

    expect(onChange).toHaveBeenCalledWith("#a1b2c3");
  });
});
