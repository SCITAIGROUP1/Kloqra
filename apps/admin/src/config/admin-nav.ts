import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Briefcase,
  CircleDollarSign,
  ClipboardCheck,
  Clock,
  Download,
  FolderKanban,
  LayoutDashboard,
  Settings2,
  Tags,
  Users,
  LifeBuoy
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
  {
    href: "/project-managers",
    label: "Project managers",
    Icon: Briefcase,
    keywords: ["pm", "project manager", "managers", "provisioning"]
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
  {
    href: "/billing",
    label: "Hourly rates",
    Icon: CircleDollarSign,
    keywords: ["billing", "rates", "hourly"]
  },
  { href: "/exports", label: "Exports", Icon: Download, keywords: ["reports"] },
  {
    href: "/workspace",
    label: "Workspace settings",
    Icon: Settings2,
    keywords: ["workspace", "timezone", "organization"]
  },
  { href: "/support", label: "Support", Icon: LifeBuoy, keywords: ["help", "ticket"] }
] as const;
