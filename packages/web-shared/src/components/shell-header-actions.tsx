"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  UserAvatar,
  appBarIconButtonClass,
  appBarToolbarClass,
  cn
} from "@kloqra/ui";
import { BookOpen, Map, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSessionStore } from "../stores/session.store";
import { NotificationDropdown } from "./notification-dropdown";
import { ThemeToggle } from "./theme-toggle";

export type ShellHeaderActionsProps = {
  workspaceId?: string;
  profileHref?: string;
  settingsHref?: string;
  notificationsHref?: string;
  /** @deprecated Use onShowOnboardingWizard / onShowOnboardingTour instead */
  onShowOnboarding?: () => void;
  onShowOnboardingWizard?: () => void;
  onShowOnboardingTour?: () => void;
  onboardingReplayTourId?: string;
  className?: string;
};

/** Global app bar actions: notifications, appearance, profile avatar. */
export function ShellHeaderActions({
  workspaceId = "",
  profileHref = "/profile",
  settingsHref = "/settings",
  notificationsHref = "/notifications",
  onShowOnboarding,
  onShowOnboardingWizard,
  onShowOnboardingTour,
  onboardingReplayTourId = "onboarding-replay",
  className
}: ShellHeaderActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useSessionStore((s) => s.session?.user);
  const userName = user?.name ?? "User";

  const showWizard = onShowOnboardingWizard ?? onShowOnboarding;
  const showTour = onShowOnboardingTour;
  const hasOnboardingMenu = Boolean(showWizard || showTour);

  return (
    <div className={cn(appBarToolbarClass, className)}>
      {hasOnboardingMenu ? (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={appBarIconButtonClass()}
              title="Onboarding help"
              aria-label="Onboarding help"
              data-tour={onboardingReplayTourId}
            >
              <Sparkles strokeWidth={1.5} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1.5">
            {showWizard ? (
              <button
                type="button"
                aria-label="Full setup guide"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/80 transition-colors"
                onClick={() => {
                  setMenuOpen(false);
                  showWizard();
                }}
              >
                <BookOpen className="size-4 shrink-0 text-primary" strokeWidth={1.5} />
                <span>
                  <span className="block font-medium">Full setup guide</span>
                  <span className="block text-xs text-muted-foreground">5-step walkthrough</span>
                </span>
              </button>
            ) : null}
            {showTour ? (
              <button
                type="button"
                aria-label="Quick product tour"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/80 transition-colors"
                onClick={() => {
                  setMenuOpen(false);
                  showTour();
                }}
              >
                <Map className="size-4 shrink-0 text-primary" strokeWidth={1.5} />
                <span>
                  <span className="block font-medium">Quick product tour</span>
                  <span className="block text-xs text-muted-foreground">Highlight key areas</span>
                </span>
              </button>
            ) : null}
          </PopoverContent>
        </Popover>
      ) : null}
      <NotificationDropdown workspaceId={workspaceId} viewAllHref={notificationsHref} />
      <ThemeToggle variant="icon-menu" />
      <Link
        href={settingsHref}
        className={appBarIconButtonClass()}
        title="Settings"
        aria-label="Settings"
      >
        <Settings strokeWidth={1.5} />
      </Link>
      <UserAvatar
        name={userName}
        firstName={user?.firstName}
        lastName={user?.lastName}
        href={profileHref}
      />
    </div>
  );
}
