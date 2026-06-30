import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatePicker } from "./date-picker.js";

describe("DatePicker", () => {
  it("shows the selected date label on the trigger", () => {
    render(
      <DatePicker
        value="2026-06-13"
        onChange={vi.fn()}
        placeholder="Select date"
        ariaLabel="Select date"
      />
    );

    expect(screen.getByRole("button", { name: "Select date" })).toHaveTextContent("Jun 13, 2026");
  });

  it("updates value and closes on day click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DatePicker
        value="2026-06-08"
        onChange={onChange}
        placeholder="Select date"
        ariaLabel="Select date"
      />
    );

    await user.click(screen.getByRole("button", { name: "Select date" }));
    await user.click(screen.getByRole("button", { name: "2026-06-20" }));

    expect(onChange).toHaveBeenCalledWith("2026-06-20");
  });

  it("highlights today with outline styling when not selected", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-20T12:00:00"));

    const user = userEvent.setup();

    render(
      <DatePicker
        value="2026-06-13"
        onChange={vi.fn()}
        placeholder="Select date"
        ariaLabel="Select date"
      />
    );

    await user.click(screen.getByRole("button", { name: "Select date" }));

    const today = screen.getByRole("button", { name: "2026-06-20" });
    expect(today).toHaveClass("border-primary");
    expect(today).not.toHaveClass("bg-primary");
    expect(today).toHaveAttribute("aria-current", "date");
  });

  it("highlights today with primary bg when today is selected", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-20T12:00:00"));

    const user = userEvent.setup();

    render(
      <DatePicker
        value="2026-06-20"
        onChange={vi.fn()}
        placeholder="Select date"
        ariaLabel="Select date"
      />
    );

    await user.click(screen.getByRole("button", { name: "Select date" }));

    const today = screen.getByRole("button", { name: "2026-06-20" });
    expect(today).toHaveClass("bg-primary");
    expect(today).not.toHaveClass("border-primary");
  });

  it("disables future dates when maxDate is set", async () => {
    const user = userEvent.setup();

    render(
      <DatePicker
        value="2026-06-10"
        onChange={vi.fn()}
        maxDate="2026-06-10"
        placeholder="Select date"
        ariaLabel="Select date"
      />
    );

    await user.click(screen.getByRole("button", { name: "Select date" }));

    const futureDay = screen.getByRole("button", { name: "2026-06-11" });
    expect(futureDay).toBeDisabled();
    expect(futureDay).toHaveClass("opacity-30");
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
