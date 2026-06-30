import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Building2,
  ClipboardCheck,
  Clock,
  CreditCard,
  Download,
  FolderKanban,
  LayoutDashboard,
  Tags,
  Users
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  keywords?: readonly string[];
};

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    Icon: LayoutDashboard,
    keywords: ["analytics", "home"]
  },
  {
    href: "/team-management",
    label: "Team Management",
    Icon: Users,
    keywords: ["members", "invite", "people"]
  },
  { href: "/projects", label: "Projects", Icon: FolderKanban, keywords: ["clients"] },
  { href: "/categories", label: "Categories", Icon: Tags },
  { href: "/team", label: "Team Live", Icon: Activity, keywords: ["presence", "tracking"] },
  {
    href: "/approvals",
    label: "Approvals",
    Icon: ClipboardCheck,
    keywords: ["timesheets", "submissions"]
  },
  {
    href: "/time-tracker",
    label: "Time Tracker",
    Icon: Clock,
    keywords: ["timelogs", "tracker", "hours"]
  },
  { href: "/notifications", label: "Notifications", Icon: Bell },
  { href: "/billing", label: "Billing", Icon: CreditCard, keywords: ["rates", "hourly"] },
  { href: "/exports", label: "Exports", Icon: Download, keywords: ["reports"] },
  {
    href: "/workspace",
    label: "Workspace",
    Icon: Building2,
    keywords: ["settings", "organization"]
  }
] as const;
