"use client";

import type { TeamMemberOverviewDto } from "@kloqra/contracts";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ShellMenuItem,
  ShellMenuPanel,
  cn
} from "@kloqra/ui";
import {
  Eye,
  Mail,
  MoreVertical,
  Pencil,
  Trash2,
  UserCircle,
  UserX,
  UserCheck
} from "lucide-react";
import { useState } from "react";

type TeamMemberActionsProps = {
  member: TeamMemberOverviewDto;
  isSelf: boolean;
  busy: boolean;
  onViewProfile: () => void;
  onEditMember: () => void;
  onViewAsMember: () => void;
  onResendCredentials?: () => void;
  onChangeStatus: (isActive: boolean) => void;
  onRemove: () => void;
};

export function TeamMemberActions({
  member,
  isSelf,
  busy,
  onViewProfile,
  onEditMember,
  onViewAsMember,
  onResendCredentials,
  onChangeStatus,
  onRemove
}: TeamMemberActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (isSelf) {
    return <span className="text-xs italic text-muted-foreground">You</span>;
  }

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Actions for ${member.userName}`}
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
          <div
            className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            role="presentation"
          >
            Change status
          </div>
          {member.isActive ? (
            <ShellMenuItem
              onClick={() => {
                setMenuOpen(false);
                onChangeStatus(false);
              }}
            >
              <UserX className="size-4 shrink-0" aria-hidden />
              Deactivate
            </ShellMenuItem>
          ) : (
            <ShellMenuItem
              onClick={() => {
                setMenuOpen(false);
                onChangeStatus(true);
              }}
            >
              <UserCheck className="size-4 shrink-0" aria-hidden />
              Activate
            </ShellMenuItem>
          )}
          {member.pendingCredentials && onResendCredentials ? (
            <ShellMenuItem
              onClick={() => {
                setMenuOpen(false);
                onResendCredentials();
              }}
            >
              <Mail className="size-4 shrink-0" aria-hidden />
              Resend sign-in email
            </ShellMenuItem>
          ) : null}
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
      </PopoverContent>
    </Popover>
  );
}
