import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select.js";

describe("Select", () => {
  it("opens list and selects an option", async () => {
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label="Period">
          <SelectValue placeholder="Choose period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
        </SelectContent>
      </Select>
    );

    await user.click(screen.getByRole("combobox", { name: "Period" }));
    await user.click(screen.getByRole("option", { name: "Weekly" }));
    expect(screen.getByRole("combobox", { name: "Period" })).toHaveTextContent("Weekly");
  });

  it("renders content above modal layers when open", async () => {
    render(
      <Select defaultOpen>
        <SelectTrigger aria-label="Project">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="p1">Support Retainer</SelectItem>
        </SelectContent>
      </Select>
    );

    const content = screen.getByRole("option", { name: "Support Retainer" });
    expect(content.closest("[class*='z-[70]']")).toBeInTheDocument();
  });
});
