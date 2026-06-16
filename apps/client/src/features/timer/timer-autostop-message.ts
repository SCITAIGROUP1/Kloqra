import { HARD_AUTO_STOP_HOURS } from "@kloqra/contracts";

export function formatAutoStopToastMessage(): string {
  return `Your timer was automatically stopped after ${HARD_AUTO_STOP_HOURS} hours. A time entry was saved on your behalf.`;
}
