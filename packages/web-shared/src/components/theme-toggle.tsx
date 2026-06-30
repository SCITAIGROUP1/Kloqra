"use client";

import { AppBarIconButton, cn, ShellMenuPanel, ShellMenuRadioItem } from "@kloqra/ui";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useThemePreference } from "../hooks/use-theme-preference";

type ThemeChoice = "light" | "dark" | "system";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor }
];

export type ThemeToggleVariant = "segmented" | "icon-cycle" | "icon-menu";

export function ThemeToggle({
  className,
  collapsed,
  variant
}: {
  className?: string;
  collapsed?: boolean;
  /** `icon-menu` — app bar icon with compact dropdown. `icon-cycle` — single icon cycles themes. `segmented` — inline 3-option grid. */
  variant?: ThemeToggleVariant;
}) {
  const resolvedVariant: ThemeToggleVariant = variant ?? (collapsed ? "icon-cycle" : "segmented");
  const { theme, applyTheme } = useThemePreference();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (!mounted) {
    return <div className={cn("h-10 w-10 rounded-xl bg-muted/40", className)} aria-hidden />;
  }

  const active = (theme ?? "system") as ThemeChoice;
  const activeOption = OPTIONS.find((opt) => opt.value === active) ?? OPTIONS[2];
  const ActiveIcon = activeOption.Icon;

  if (resolvedVariant === "icon-cycle") {
    const cycleTheme = () => {
      const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
      applyTheme(nextTheme);
    };

    return (
      <AppBarIconButton
        onClick={cycleTheme}
        className={className}
        title={`Theme: ${activeOption.label} (click to cycle)`}
        aria-label={`Theme: ${activeOption.label}`}
      >
        <ActiveIcon aria-hidden />
      </AppBarIconButton>
    );
  }

  if (resolvedVariant === "icon-menu") {
    return (
      <div className={cn("relative", className)} ref={menuRef}>
        <AppBarIconButton
          onClick={() => setOpen((value) => !value)}
          aria-label="Appearance"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <Moon aria-hidden />
        </AppBarIconButton>
        {open ? (
          <ShellMenuPanel aria-label="Appearance">
            {OPTIONS.map(({ value, label, Icon }) => {
              const isActive = active === value;
              return (
                <ShellMenuRadioItem
                  key={value}
                  active={isActive}
                  onClick={() => {
                    applyTheme(value);
                    setOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1 text-left">{label}</span>
                  {isActive ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                </ShellMenuRadioItem>
              );
            })}
          </ShellMenuPanel>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-0.5 rounded-lg border border-border/80 bg-muted/40 p-1",
        className
      )}
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => applyTheme(value)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
            aria-pressed={isActive}
            title={label}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
