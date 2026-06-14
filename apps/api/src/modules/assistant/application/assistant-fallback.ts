import type { AssistantChatResponseDto, AssistantLinkDto } from "@kloqra/contracts";

export const ASSISTANT_FALLBACK_LINKS: AssistantLinkDto[] = [
  { label: "Timer", href: "/timer" },
  { label: "Timesheet", href: "/timesheet" },
  { label: "Submissions", href: "/submissions" },
  { label: "My Projects", href: "/projects" }
];

export function buildAssistantFallbackReply(): AssistantChatResponseDto {
  return {
    reply:
      "The help assistant is temporarily unavailable. You can still use Timer to track time, Timesheet to edit entries, and Submissions to send timesheets for approval. Open the sparkles menu in the header for the Full setup guide.",
    links: ASSISTANT_FALLBACK_LINKS
  };
}
