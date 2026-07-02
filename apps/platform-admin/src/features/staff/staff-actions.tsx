"use client";

import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ShellMenuItem,
  ShellMenuPanel,
  cn
} from "@kloqra/ui";
import { usePlatformSessionStore } from "@kloqra/web-shared";
import { Key, MoreVertical, Pencil, Power, Trash2 } from "lucide-react";
import { useState } from "react";

type StaffType = {
  id: string;
  name: string;
  email: string;
  role: "SUPERADMIN" | "SUPPORT";
  isActive: boolean;
};

type StaffActionsProps = {
  staff: StaffType;
  onEdit: () => void;
  onChangeStatus: (isActive: boolean) => void;
  onChangePassword: () => void;
  onDelete: () => void;
  busy?: boolean;
};

export function StaffActions({
  staff,
  onEdit,
  onChangeStatus,
  onChangePassword,
  onDelete,
  busy = false
}: StaffActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const session = usePlatformSessionStore((s) => s.session);

  const isSelf = session?.user?.id === staff.id;

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Actions for ${staff.name}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          disabled={busy}
        >
          <MoreVertical className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={4} className="w-auto p-0">
        <ShellMenuPanel
          className={cn(
            "static right-auto top-auto mt-0 min-w-[12.5rem] border-0 bg-transparent p-1 shadow-none animate-none"
          )}
        >
          <ShellMenuItem
            onClick={() => {
              setMenuOpen(false);
              onEdit();
            }}
          >
            <Pencil className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            Edit details
          </ShellMenuItem>

          <ShellMenuItem
            onClick={() => {
              setMenuOpen(false);
              onChangePassword();
            }}
          >
            <Key className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            Change password
          </ShellMenuItem>

          <ShellMenuItem
            disabled={isSelf}
            className={cn(isSelf && "opacity-50 cursor-not-allowed")}
            onClick={() => {
              if (isSelf) return;
              setMenuOpen(false);
              onChangeStatus(!staff.isActive);
            }}
          >
            <Power className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {staff.isActive ? "Deactivate" : "Activate"}
          </ShellMenuItem>

          <ShellMenuItem
            tone="destructive"
            disabled={isSelf}
            className={cn(isSelf && "opacity-50 cursor-not-allowed")}
            onClick={() => {
              if (isSelf) return;
              setMenuOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="size-4 shrink-0" aria-hidden />
            Delete staff
          </ShellMenuItem>
        </ShellMenuPanel>
      </PopoverContent>
    </Popover>
  );
}
