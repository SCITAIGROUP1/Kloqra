import type { SpotlightTourStep } from "@kloqra/ui";

export const ONBOARDING_TOUR_STEPS: SpotlightTourStep[] = [
  {
    target: '[data-tour="nav-timer"]',
    title: "Your navigation hub",
    body: "Everything you need is in the sidebar — timer, time tracker, projects, and more.",
    placement: "right",
    mobileHint: "Open the menu (☰) to find Timer and other sections."
  },
  {
    target: '[data-tour="nav-timer"]',
    title: "Timer",
    body: "Pick a project and assigned task, then start tracking live. Use Space or Ctrl+Shift+T as shortcuts.",
    placement: "right",
    mobileHint: "Find Timer in the navigation menu."
  },
  {
    target: '[data-tour="nav-time-tracker"]',
    title: "Time Tracker",
    body: "Review and edit past entries by week. Filter by project, task, and custom date ranges.",
    placement: "right",
    mobileHint: "Find Time Tracker in the navigation menu."
  },
  {
    target: '[data-tour="nav-projects"]',
    title: "My projects",
    body: "See your hours, charts, and personalize your project display color on each overview page.",
    placement: "right",
    mobileHint: "Find My projects in the navigation menu."
  },
  {
    target: '[data-tour="nav-submissions"]',
    title: "Submissions",
    body: "Submit timesheets for review when your workspace requires approval before billing.",
    placement: "right",
    mobileHint: "Find Submissions in the navigation menu."
  },
  {
    target: '[data-tour="onboarding-replay"]',
    title: "Replay anytime",
    body: "Tap the sparkles icon to reopen the setup guide or take this quick tour again.",
    placement: "bottom",
    mobileHint: "The sparkles help button is in the top header bar."
  }
];
