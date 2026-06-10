"use client";

import type { TeamMemberOverviewDto } from "@kloqra/contracts";
import { Button, ShellMenuItem, ShellMenuPanel, cn } from "@kloqra/ui";
import { Eye, MoreVertical, Pencil, Trash2, UserCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type TeamMemberActionsProps = {
  member: TeamMemberOverviewDto;
  isSelf: boolean;
  busy: boolean;
  onViewProfile: () => void;
  onEditMember: () => void;
  onViewAsMember: () => void;
  onRemove: () => void;
};

export function TeamMemberActions({
  member,
  isSelf,
  busy,
  onViewProfile,
  onEditMember,
  onViewAsMember,
  onRemove
}: TeamMemberActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  if (isSelf) {
    return <span className="text-xs italic text-muted-foreground">You</span>;
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label={`Actions for ${member.userName}`}
        aria-expanded={menuOpen}
        disabled={busy}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MoreVertical className="size-4" />
      </Button>
      {menuOpen ? (
        <ShellMenuPanel className={cn("absolute right-0 top-full z-20 mt-1 min-w-[12.5rem]")}>
          <ShellMenuItem
            onClick={() => {
              setMenuOpen(false);
              onViewProfile();
            }}
          >
            <Eye className="size-4 shrink-0" aria-hidden />
            View Profile
          </ShellMenuItem>
          <ShellMenuItem
            onClick={() => {
              setMenuOpen(false);
              onEditMember();
            }}
          >
            <Pencil className="size-4 shrink-0" aria-hidden />
            Edit Member
          </ShellMenuItem>
          <ShellMenuItem
            onClick={() => {
              setMenuOpen(false);
              onViewAsMember();
            }}
          >
            <UserCircle className="size-4 shrink-0" aria-hidden />
            View As Member
          </ShellMenuItem>
          <ShellMenuItem
            tone="destructive"
            onClick={() => {
              setMenuOpen(false);
              onRemove();
            }}
          >
            <Trash2 className="size-4 shrink-0" aria-hidden />
            Remove Member
          </ShellMenuItem>
        </ShellMenuPanel>
      ) : null}
    </div>
  );
}
