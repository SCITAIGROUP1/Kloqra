"use client";

import { ProjectColorPicker } from "./project-color.js";
import { Label } from "./ui/label.js";

export type MemberProjectColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  colors: readonly string[];
  onClear?: () => void;
  disabled?: boolean;
};

export function MemberProjectColorPicker({
  value,
  onChange,
  colors,
  onClear,
  disabled = false
}: MemberProjectColorPickerProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Your color for this project</Label>
      <p className="text-xs text-muted-foreground">
        Personal display color — does not change the workspace project color for admins.
      </p>
      <ProjectColorPicker
        value={value}
        onChange={onChange}
        colors={colors}
        allowCustom
        disabled={disabled}
      />
      {onClear ? (
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={onClear}
          disabled={disabled}
        >
          Reset to project default
        </button>
      ) : null}
    </div>
  );
}
