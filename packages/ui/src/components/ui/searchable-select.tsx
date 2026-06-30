"use client";

import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { getOptionSearchText, type FilterableOption } from "../../lib/filter-options.js";
import { useLockDialogBodyScroll } from "../../lib/use-lock-dialog-body-scroll.js";
import { cn } from "../../lib/utils.js";
import { Button } from "./button.js";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "./command.js";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js";

export type SearchableSelectOption = FilterableOption & {
  disabled?: boolean;
};

export type SearchableSelectGroup = {
  label: string;
  options: SearchableSelectOption[];
};

export type SearchableSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options?: SearchableSelectOption[];
  groups?: SearchableSelectGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  renderOption?: (option: SearchableSelectOption) => React.ReactNode;
  renderValue?: (option: SearchableSelectOption | undefined) => React.ReactNode;
};

function flattenOptions(
  options: SearchableSelectOption[] | undefined,
  groups: SearchableSelectGroup[] | undefined
): SearchableSelectOption[] {
  if (groups?.length) return groups.flatMap((group) => group.options);
  return options ?? [];
}

function commandItemValue(option: SearchableSelectOption): string {
  return getOptionSearchText(option);
}

function SearchableSelectOptionRow({
  option,
  selected,
  onSelect,
  renderOption
}: {
  option: SearchableSelectOption;
  selected: boolean;
  onSelect: (value: string) => void;
  renderOption?: (option: SearchableSelectOption) => React.ReactNode;
}) {
  return (
    <CommandItem
      key={option.value}
      value={commandItemValue(option)}
      disabled={option.disabled}
      onSelect={() => onSelect(option.value)}
      className="pr-8"
    >
      {renderOption ? renderOption(option) : option.label}
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <Check className={cn("h-4 w-4", selected ? "opacity-100" : "opacity-0")} aria-hidden />
      </span>
    </CommandItem>
  );
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  groups,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found.",
  disabled = false,
  id,
  "aria-label": ariaLabel,
  className,
  triggerClassName,
  contentClassName,
  renderOption,
  renderValue
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  useLockDialogBodyScroll(open, triggerRef);
  const allOptions = React.useMemo(() => flattenOptions(options, groups), [options, groups]);
  const selectedOption = allOptions.find((option) => option.value === value);

  function handleSelect(nextValue: string) {
    onValueChange(nextValue);
    setOpen(false);
  }

  const displayValue = renderValue
    ? renderValue(selectedOption)
    : (selectedOption?.label ?? placeholder);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between font-normal shadow-sm [&>span]:line-clamp-1",
            !selectedOption && "text-muted-foreground",
            triggerClassName,
            className
          )}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[var(--radix-popover-trigger-width)] overscroll-contain p-0",
          contentClassName
        )}
        align="start"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onWheel={(event) => event.stopPropagation()}
      >
        <Command shouldFilter>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {groups?.length
              ? groups.map((group) => (
                  <CommandGroup key={group.label} heading={group.label}>
                    {group.options.map((option) => (
                      <SearchableSelectOptionRow
                        key={option.value}
                        option={option}
                        selected={value === option.value}
                        onSelect={handleSelect}
                        renderOption={renderOption}
                      />
                    ))}
                  </CommandGroup>
                ))
              : (options ?? []).map((option) => (
                  <SearchableSelectOptionRow
                    key={option.value}
                    option={option}
                    selected={value === option.value}
                    onSelect={handleSelect}
                    renderOption={renderOption}
                  />
                ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
