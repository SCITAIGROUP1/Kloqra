"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { cn } from "../../lib/utils.js";
import {
  sidebarCollapsedLogoutButtonClass,
  sidebarLogoutButtonClass,
  sidebarProfileLinkClass
} from "./shell-styles.js";
import { UserAvatar } from "./user-avatar.js";

export type SidebarUserFooterProps = {
  userName: string;
  firstName?: string | null;
  lastName?: string | null;
  profileHref: string;
  onLogout: () => void;
  collapsed?: boolean;
  className?: string;
};

export function SidebarUserFooter({
  userName,
  firstName,
  lastName,
  profileHref,
  onLogout,
  collapsed = false,
  className
}: SidebarUserFooterProps) {
  if (collapsed) {
    return (
      <div className={cn("flex flex-col items-center gap-1.5", className)}>
        <UserAvatar
          name={userName}
          firstName={firstName}
          lastName={lastName}
          href={profileHref}
          className="h-9 w-9 text-xs"
        />
        <button
          type="button"
          onClick={onLogout}
          className={sidebarCollapsedLogoutButtonClass}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Link href={profileHref} className={sidebarProfileLinkClass}>
        <UserAvatar name={userName} firstName={firstName} lastName={lastName} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">{userName}</p>
          <p className="truncate text-xs text-muted-foreground">View Profile</p>
        </div>
      </Link>
      <button type="button" onClick={onLogout} className={sidebarLogoutButtonClass}>
        <LogOut className="h-4 w-4 shrink-0" aria-hidden />
        Log out
      </button>
    </div>
  );
}
