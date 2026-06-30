const DEFAULT_PROMPTS = [
  "How do I start a timer?",
  "Submit my timesheet",
  "Export my hours"
] as const;

const ROUTE_PROMPTS: ReadonlyArray<{ prefix: string; prompts: readonly string[] }> = [
  {
    prefix: "/timer",
    prompts: ["How do I start a timer?", "Why can't I edit this entry?", "Pause or stop my timer"]
  },
  {
    prefix: "/timesheet",
    prompts: ["How do I add an entry?", "Export my hours", "Edit or delete a manual entry"]
  },
  {
    prefix: "/submissions",
    prompts: ["Submit my timesheet", "What does pending mean?", "Check submission status"]
  },
  {
    prefix: "/time-tracker",
    prompts: ["Find my time entries", "How do I add an entry?", "Export my hours"]
  },
  {
    prefix: "/dashboard",
    prompts: ["Customize my dashboard", "How do I start a timer?", "See my weekly hours"]
  },
  {
    prefix: "/projects",
    prompts: ["Join a project", "Find my assigned tasks", "How do I start a timer?"]
  }
];

export function getContextualPrompts(pathname: string): readonly string[] {
  const match = ROUTE_PROMPTS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return match?.prompts ?? DEFAULT_PROMPTS;
}
