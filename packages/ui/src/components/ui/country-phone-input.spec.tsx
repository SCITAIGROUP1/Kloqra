import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CountryPhoneInput } from "./country-phone-input.js";

describe("CountryPhoneInput", () => {
  it("renders correctly with formatted value", () => {
    const handleChange = vi.fn();
    render(<CountryPhoneInput value="+94771234567" onChange={handleChange} />);
    expect(screen.getByPlaceholderText("Phone number")).toHaveValue("771234567");
  });

  it("calls onChange when national phone number changes", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<CountryPhoneInput value="" onChange={handleChange} />);

    const input = screen.getByPlaceholderText("Phone number");
    await user.type(input, "1");
    expect(handleChange).toHaveBeenCalled();
  });
});
