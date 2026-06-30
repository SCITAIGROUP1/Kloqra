import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "./command.js";

describe("Command", () => {
  it("renders input and filters items", async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput placeholder="Search items" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Fruits">
            <CommandItem value="apple">Apple</CommandItem>
            <CommandItem value="banana">Banana</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );

    expect(screen.getByPlaceholderText("Search items")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search items"), "ban");
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
  });

  it("fires onSelect when an enabled item is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Command>
        <CommandList>
          <CommandItem value="apple" onSelect={onSelect}>
            Apple
          </CommandItem>
        </CommandList>
      </Command>
    );

    await user.click(screen.getByText("Apple"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("contains overscroll inside the command list", () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
        </CommandList>
      </Command>
    );

    expect(container.querySelector("[cmdk-list]")).toHaveClass("overscroll-contain");
  });
});
