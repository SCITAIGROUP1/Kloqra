"use client";

import { Button } from "@kloqra/ui";
import { Save } from "lucide-react";
import type { ReactNode } from "react";

export function SettingsSaveBar({
  onSave,
  saving,
  disabled,
  children
}: {
  onSave?: () => void;
  saving?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border pt-6">
      {children ?? (
        <Button onClick={onSave} disabled={disabled || saving} className="gap-2">
          <Save className="size-4" aria-hidden />
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      )}
    </div>
  );
}
