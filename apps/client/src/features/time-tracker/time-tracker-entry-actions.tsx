"use client";

import type { TimeLogDto } from "@kloqra/contracts";
import { Button, ShellMenuItem, ShellMenuPanel, cn } from "@kloqra/ui";
import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type TimeTrackerEntryActionsProps = {
  log: TimeLogDto;
  locked: boolean;
  onEdit: (log: TimeLogDto) => void;
  onDelete: (log: TimeLogDto) => void;
};

export function TimeTrackerEntryActions({
  log,
  locked,
  onEdit,
  onDelete
}: TimeTrackerEntryActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  return (
    <div className="relative inline-block" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 opacity-70 hover:opacity-100"
        aria-label="Entry actions"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MoreVertical className="size-4" />
      </Button>
      {menuOpen ? (
        <ShellMenuPanel className={cn("absolute right-0 top-full z-20 mt-1 min-w-[8rem]")}>
          {locked ? (
            <ShellMenuItem
              onClick={() => {
                setMenuOpen(false);
                onEdit(log);
              }}
            >
              View
            </ShellMenuItem>
          ) : (
            <>
              <ShellMenuItem
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(log);
                }}
              >
                Edit
              </ShellMenuItem>
              <ShellMenuItem
                tone="destructive"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(log);
                }}
              >
                Delete
              </ShellMenuItem>
            </>
          )}
        </ShellMenuPanel>
      ) : null}
    </div>
  );
}
