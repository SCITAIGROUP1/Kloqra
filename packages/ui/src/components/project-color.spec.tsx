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

  it("commits custom hex from the text field", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ProjectColorPicker value="#236bfe" onChange={onChange} colors={COLORS} />);

    const hexInput = screen.getByRole("textbox", { name: "Custom color hex" });
    await user.clear(hexInput);
    await user.type(hexInput, "#ff00aa");
    await user.tab();

    expect(onChange).toHaveBeenCalledWith("#ff00aa");
  });

  it("hides custom input when allowCustom is false", () => {
    render(
      <ProjectColorPicker value="#236bfe" onChange={() => {}} colors={COLORS} allowCustom={false} />
    );

    expect(screen.queryByRole("textbox", { name: "Custom color hex" })).not.toBeInTheDocument();
  });
});
