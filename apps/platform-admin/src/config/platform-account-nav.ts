import type { LucideIcon } from "lucide-react";
import { Settings, UserRound } from "lucide-react";

export type PlatformAccountNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

export const PLATFORM_ACCOUNT_NAV_ITEMS: readonly PlatformAccountNavItem[] = [
  { href: "/profile", label: "Profile", Icon: UserRound },
  { href: "/settings", label: "Settings", Icon: Settings }
] as const;
