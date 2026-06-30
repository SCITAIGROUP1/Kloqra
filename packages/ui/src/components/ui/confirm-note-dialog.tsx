"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { AppModal } from "./app-modal.js";
import { Button } from "./button.js";
import { Label } from "./label.js";

export type ConfirmNoteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  noteLabel?: string;
  notePlaceholder?: string;
  noteRequired?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  submitting?: boolean;
  initialNote?: string;
  onConfirm: (note: string) => void;
};

export function ConfirmNoteDialog({
  open,
  onOpenChange,
  title,
  description,
  noteLabel = "Note",
  notePlaceholder,
  noteRequired = false,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  submitting = false,
  initialNote = "",
  onConfirm
}: ConfirmNoteDialogProps) {
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (open) setNote(initialNote);
  }, [open, initialNote]);

  const trimmed = note.trim();
  const canConfirm = !noteRequired || trimmed.length > 0;

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={<AlertTriangle className="size-5" />}
      tone={destructive ? "destructive" : "default"}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={submitting || !canConfirm}
            onClick={() => onConfirm(trimmed)}
          >
            {submitting ? "Working…" : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="confirm-note">
          {noteLabel}
          {noteRequired ? <span className="text-destructive"> *</span> : null}
        </Label>
        <textarea
          id="confirm-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={notePlaceholder}
          maxLength={2000}
          rows={4}
          disabled={submitting}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {noteRequired ? (
          <p className="text-xs text-muted-foreground">
            A note is required before you can continue.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            You can leave this blank if you have no extra feedback.
          </p>
        )}
      </div>
    </AppModal>
  );
}
