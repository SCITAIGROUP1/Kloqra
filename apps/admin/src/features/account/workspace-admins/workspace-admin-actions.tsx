"use client";

import type { WorkspaceAdminOverviewDto } from "@kloqra/contracts";
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
  UserCircle,
  UserMinus,
  UserPlus,
  UserX,
  UserCheck
} from "lucide-react";
import { useState } from "react";

type WorkspaceAdminActionsProps = {
  admin: WorkspaceAdminOverviewDto;
  busy: boolean;
  onViewProfile: () => void;
  onAssignWorkspace: () => void;
  onResendCredentials?: () => void;
  onChangeStatus: (isActive: boolean) => void;
  onDemote: () => void;
  onRemove: () => void;
  onViewAsMember: () => void;
};

export function WorkspaceAdminActions({
  admin,
  busy,
  onViewProfile,
  onAssignWorkspace,
  onResendCredentials,
  onChangeStatus,
  onDemote,
  onRemove,
  onViewAsMember
}: WorkspaceAdminActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Actions for ${admin.userName}`}
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
              onAssignWorkspace();
            }}
          >
            <UserPlus className="size-4 shrink-0" aria-hidden />
            Assign to workspace
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
          <div
            className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            role="presentation"
          >
            Change status
          </div>
          {admin.isActive ? (
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
          {admin.pendingCredentials && onResendCredentials ? (
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
            onClick={() => {
              setMenuOpen(false);
              onDemote();
            }}
          >
            <UserMinus className="size-4 shrink-0" aria-hidden />
            Demote to member
          </ShellMenuItem>
          <ShellMenuItem
            tone="destructive"
            onClick={() => {
              setMenuOpen(false);
              onRemove();
            }}
          >
            <UserMinus className="size-4 shrink-0" aria-hidden />
            Remove from workspace
          </ShellMenuItem>
        </ShellMenuPanel>
      </PopoverContent>
    </Popover>
  );
}
