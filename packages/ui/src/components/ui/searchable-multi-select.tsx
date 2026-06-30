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

export type SearchableMultiSelectOption = FilterableOption & {
  disabled?: boolean;
};

export type SearchableMultiSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  options: SearchableMultiSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  selectAllLabel?: string;
  renderOption?: (option: SearchableMultiSelectOption) => React.ReactNode;
};

function commandItemValue(option: SearchableMultiSelectOption): string {
  return getOptionSearchText(option);
}

export function SearchableMultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found.",
  disabled = false,
  id,
  "aria-label": ariaLabel,
  className,
  triggerClassName,
  contentClassName,
  selectAllLabel = "Select all",
  renderOption
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  useLockDialogBodyScroll(open, triggerRef);
  const selected = new Set(value);
  const allSelected = options.length > 0 && options.every((option) => selected.has(option.value));

  function toggle(optionValue: string) {
    if (selected.has(optionValue)) {
      onChange(value.filter((id) => id !== optionValue));
      return;
    }
    onChange([...new Set([...value, optionValue])]);
  }

  function toggleAll() {
    onChange(allSelected ? [] : options.map((option) => option.value));
  }

  const summaryLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((option) => option.value === value[0])?.label ?? `${value.length} selected`)
        : `${value.length} selected`;

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
            value.length === 0 && "text-muted-foreground",
            triggerClassName,
            className
          )}
        >
          <span className="truncate">{summaryLabel}</span>
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
            <CommandGroup>
              <CommandItem value={selectAllLabel} onSelect={toggleAll} className="pr-8">
                {selectAllLabel}
                <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                  <Check
                    className={cn("h-4 w-4", allSelected ? "opacity-100" : "opacity-0")}
                    aria-hidden
                  />
                </span>
              </CommandItem>
              {options.map((option) => {
                const isSelected = selected.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={commandItemValue(option)}
                    disabled={option.disabled}
                    onSelect={() => toggle(option.value)}
                    className="pr-8"
                  >
                    {renderOption ? renderOption(option) : option.label}
                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check
                        className={cn("h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                        aria-hidden
                      />
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
