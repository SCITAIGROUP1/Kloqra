"use client";

import type { TimeLogDto } from "@kloqra/contracts";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ShellMenuItem,
  ShellMenuPanel,
  cn
} from "@kloqra/ui";
import { MoreVertical } from "lucide-react";
import { useState } from "react";

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

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 opacity-70 hover:opacity-100"
          aria-label="Entry actions"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <MoreVertical className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={4} className="w-auto p-0">
        <ShellMenuPanel
          className={cn(
            "static right-auto top-auto mt-0 min-w-[8rem] border-0 bg-transparent p-1 shadow-none animate-none"
          )}
        >
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
      </PopoverContent>
    </Popover>
  );
}
