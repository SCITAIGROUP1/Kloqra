"use client";

import { cn } from "@chronomint/ui";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ThemeChoice = "light" | "dark" | "system";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor }
];

export function ThemeToggle({ className, collapsed }: { className?: string; collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn("h-9 rounded-lg bg-muted/40", className)} aria-hidden />;
  }

  const active = (theme ?? "system") as ThemeChoice;

  if (collapsed) {
    const activeOption = OPTIONS.find((opt) => opt.value === active) ?? OPTIONS[2];
    const ActiveIcon = activeOption.Icon;

    const cycleTheme = () => {
      const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
      setTheme(nextTheme);
    };

    return (
      <button
        type="button"
        onClick={cycleTheme}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-muted/40 text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors mx-auto shadow-sm",
          className
        )}
        title={`Theme: ${activeOption.label} (click to cycle)`}
      >
        <ActiveIcon className="h-4 w-4" aria-hidden />
      </button>
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
            onClick={() => setTheme(value)}
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
