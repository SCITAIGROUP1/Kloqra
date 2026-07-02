"use client";

import type { ProjectManagerOverviewDto } from "@kloqra/contracts";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ShellMenuItem,
  ShellMenuPanel,
  cn
} from "@kloqra/ui";
import { Briefcase, Eye, MoreVertical, UserCircle, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";

type ProjectManagerActionsProps = {
  manager: ProjectManagerOverviewDto;
  busy: boolean;
  onViewProfile: () => void;
  onManageAssignments: () => void;
  onAssignProject: () => void;
  onViewAsMember: () => void;
  onDemoteAll: () => void;
};

export function ProjectManagerActions({
  manager,
  busy,
  onViewProfile,
  onManageAssignments,
  onAssignProject,
  onViewAsMember,
  onDemoteAll
}: ProjectManagerActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Actions for ${manager.userName}`}
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
              onViewProfile();
            }}
          >
            <Eye className="size-4 shrink-0" aria-hidden />
            View profile
          </ShellMenuItem>
          <ShellMenuItem
            onClick={() => {
              setMenuOpen(false);
              onManageAssignments();
            }}
          >
            <Briefcase className="size-4 shrink-0" aria-hidden />
            Manage assignments
          </ShellMenuItem>
          <ShellMenuItem
            onClick={() => {
              setMenuOpen(false);
              onAssignProject();
            }}
          >
            <UserPlus className="size-4 shrink-0" aria-hidden />
            Assign to project
          </ShellMenuItem>
          <ShellMenuItem
            onClick={() => {
              setMenuOpen(false);
              onViewAsMember();
            }}
          >
            <UserCircle className="size-4 shrink-0" aria-hidden />
            View as member
          </ShellMenuItem>
          <ShellMenuItem
            tone="destructive"
            onClick={() => {
              setMenuOpen(false);
              onDemoteAll();
            }}
          >
            <UserMinus className="size-4 shrink-0" aria-hidden />
            Remove PM role
          </ShellMenuItem>
        </ShellMenuPanel>
      </PopoverContent>
    </Popover>
  );
}
