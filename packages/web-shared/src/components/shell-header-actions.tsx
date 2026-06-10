"use client";

import { UserAvatar, appBarIconButtonClass, appBarToolbarClass, cn } from "@kloqra/ui";
import { Settings } from "lucide-react";
import Link from "next/link";
import { useSessionStore } from "../stores/session.store";
import { NotificationDropdown } from "./notification-dropdown";
import { ThemeToggle } from "./theme-toggle";

export type ShellHeaderActionsProps = {
  profileHref?: string;
  settingsHref?: string;
  className?: string;
};

/** Global app bar actions: notifications, appearance, profile avatar. */
export function ShellHeaderActions({
  profileHref = "/profile",
  settingsHref = "/settings",
  className
}: ShellHeaderActionsProps) {
  const userName = useSessionStore((s) => s.session?.user.name) ?? "User";

  return (
    <div className={cn(appBarToolbarClass, className)}>
      <NotificationDropdown settingsHref={`${settingsHref}?section=notifications`} />
      <ThemeToggle variant="icon-menu" />
      <Link
        href={settingsHref}
        className={appBarIconButtonClass()}
        title="Settings"
        aria-label="Settings"
      >
        <Settings strokeWidth={1.5} />
      </Link>
      <UserAvatar name={userName} href={profileHref} />
    </div>
  );
}
