import {
  CalendarDays,
  ClipboardCheck,
  Clock,
  FolderKanban,
  LayoutGrid,
  Sparkles,
  Timer as TimerIcon,
  type LucideIcon
} from "lucide-react";

export type OnboardingStepId =
  | "welcome"
  | "workspace"
  | "track-time"
  | "projects-dashboard"
  | "finish";

export type OnboardingFeatureCardData = {
  icon: LucideIcon;
  title: string;
  description: string;
  route?: string;
};

export const ONBOARDING_STEP_IDS: OnboardingStepId[] = [
  "welcome",
  "workspace",
  "track-time",
  "projects-dashboard",
  "finish"
];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEP_IDS.length;

export function getStepNumber(stepId: OnboardingStepId): number {
  return ONBOARDING_STEP_IDS.indexOf(stepId) + 1;
}

export function getStepTitle(stepId: OnboardingStepId, userName: string, isAdmin: boolean): string {
  switch (stepId) {
    case "welcome":
      return `Welcome to Kloqra, ${userName}!`;
    case "workspace":
      return isAdmin ? "Create your first project" : "Your assigned projects";
    case "track-time":
      return "Three ways to track time";
    case "projects-dashboard":
      return "Projects & dashboard";
    case "finish":
      return "You're almost ready!";
    default:
      return "Getting started";
  }
}

export const TRACK_TIME_CARDS: OnboardingFeatureCardData[] = [
  {
    icon: TimerIcon,
    title: "Timer",
    description: "Live tracking with start, pause, and stop. Your command center for active work.",
    route: "/timer"
  },
  {
    icon: Clock,
    title: "Time Tracker",
    description: "Weekly list of entries with search, filters, and a flexible date range picker.",
    route: "/time-tracker"
  },
  {
    icon: CalendarDays,
    title: "Timesheet",
    description: "Calendar views to drag, create, and edit time slots across the week or month.",
    route: "/timesheet"
  }
];

export const PROJECTS_DASHBOARD_CARDS: OnboardingFeatureCardData[] = [
  {
    icon: FolderKanban,
    title: "My projects",
    description:
      "Open a project overview to see your hours, charts, and personalize your display color.",
    route: "/projects"
  },
  {
    icon: LayoutGrid,
    title: "Dashboard",
    description: "Customizable widgets, period filters, and a quick timer — all in one place.",
    route: "/dashboard"
  }
];

export const FINISH_HIGHLIGHTS: { icon: LucideIcon; text: string }[] = [
  {
    icon: ClipboardCheck,
    text: "Submit timesheets for approval when your workspace requires it."
  },
  {
    icon: Sparkles,
    text: "Replay this guide anytime from the sparkles icon in the header."
  }
];
