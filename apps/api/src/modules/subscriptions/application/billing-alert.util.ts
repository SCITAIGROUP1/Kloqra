import type { BillingAlert } from "@kloqra/contracts";
import { TRIAL_ENDING_ALERT_DAYS } from "../subscription.constants";

export function resolveBillingAlert(input: {
  status: string;
  trialEndsAt: Date | null;
}): BillingAlert {
  if (input.status === "past_due" || input.status === "suspended") {
    return "past_due";
  }
  if (input.status === "trial" && input.trialEndsAt) {
    const msLeft = input.trialEndsAt.getTime() - Date.now();
    const daysLeft = msLeft / (1000 * 60 * 60 * 24);
    if (daysLeft <= TRIAL_ENDING_ALERT_DAYS && daysLeft >= 0) {
      return "trial_ending";
    }
  }
  return null;
}
