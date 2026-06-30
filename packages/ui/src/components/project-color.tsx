"use client";

import { parseHexColor } from "@kloqra/contracts";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils.js";
import { Input } from "./ui/input.js";

export function normalizeDisplayColor(color: string): string {
  return color.trim().toLowerCase();
}

function relativeLuminance(hex: string): number {
  const channels = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function isLowContrastOnLightBackground(hex: string): boolean {
  const parsed = parseHexColor(hex);
  return parsed ? relativeLuminance(parsed) > 0.85 : false;
}

function projectColorsMatchLocal(a: string, b: string): boolean {
  return normalizeDisplayColor(a) === normalizeDisplayColor(b);
}

function ProjectColorCustomInput({
  value,
  onChange,
  disabled
}: {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}) {
  const normalized = normalizeDisplayColor(value);
  const [hexDraft, setHexDraft] = useState(normalized);

  useEffect(() => {
    setHexDraft(normalized);
  }, [normalized]);

  const commitDraft = (raw: string) => {
    const parsed = parseHexColor(raw);
    if (parsed) {
      onChange(parsed);
      setHexDraft(parsed);
    } else {
      setHexDraft(normalized);
    }
  };

  const colorInputValue = parseHexColor(normalized) ?? "#000000";
  const lowContrast = isLowContrastOnLightBackground(normalized);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={colorInputValue}
          disabled={disabled}
          aria-label="Custom color"
          className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          onChange={(event) => onChange(event.target.value.toLowerCase())}
        />
        <Input
          value={hexDraft}
          disabled={disabled}
          placeholder="#236bfe"
          aria-label="Custom color hex"
          className="max-w-[7.5rem] font-mono text-sm"
          onChange={(event) => setHexDraft(event.target.value)}
          onBlur={() => commitDraft(hexDraft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft(hexDraft);
            }
          }}
        />
      </div>
      {lowContrast ? (
        <p className="text-xs text-amber-600 dark:text-amber-500">
          This color may be hard to see on light backgrounds.
        </p>
      ) : null}
    </div>
  );
}

export function ProjectColorDot({
  color,
  className,
  size = "sm"
}: {
  color: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15",
        size === "sm" && "size-2.5",
        size === "md" && "size-3.5",
        size === "lg" && "size-6",
        className
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

export function ProjectColorPicker({
  value,
  onChange,
  colors,
  className,
  allowCustom = true,
  disabled
}: {
  value: string;
  onChange: (color: string) => void;
  colors: readonly string[];
  className?: string;
  allowCustom?: boolean;
  disabled?: boolean;
}) {
  const current = normalizeDisplayColor(value);
  const inPalette = colors.some((color) => projectColorsMatchLocal(current, color));

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn("flex flex-wrap gap-2", disabled && "pointer-events-none opacity-60")}
        role="radiogroup"
        aria-label="Project color"
      >
        {colors.map((color) => {
          const selected = projectColorsMatchLocal(current, color);
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={selected ? `Current color ${color}` : `Set color to ${color}`}
              title={color}
              disabled={disabled}
              className={cn(
                "relative size-8 rounded-full transition-[transform,box-shadow] hover:scale-105 disabled:cursor-not-allowed",
                selected
                  ? "scale-110 ring-[3px] ring-foreground ring-offset-2 ring-offset-background shadow-sm"
                  : "ring-1 ring-border/60 ring-offset-1 ring-offset-background"
              )}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
            >
              {selected ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg
                    viewBox="0 0 16 16"
                    className="size-4 text-white drop-shadow-sm"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <path
                      d="M3.5 8.5 6.5 11.5 12.5 4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {allowCustom ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            {inPalette ? "Or choose a custom color" : "Custom color"}
          </p>
          <ProjectColorCustomInput value={value} onChange={onChange} disabled={disabled} />
        </div>
      ) : null}
    </div>
  );
}

/** Shows the one assigned color, then a single-choice palette to change it. */
export function ProjectColorEditor({
  value,
  onChange,
  colors,
  className
}: {
  value: string;
  onChange: (color: string) => void;
  colors: readonly string[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
        <ProjectColorDot color={value} size="lg" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Current color</p>
          <p className="font-mono text-sm">{normalizeDisplayColor(value)}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Suggested colors</p>
        <ProjectColorPicker value={value} onChange={onChange} colors={colors} allowCustom />
      </div>
    </div>
  );
}

export function ProjectNameWithColor({
  name,
  color,
  className
}: {
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <ProjectColorDot color={color} />
      <span>{name}</span>
    </span>
  );
}
