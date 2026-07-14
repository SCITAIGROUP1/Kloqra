/** Max calendar days a custom trialEndsAt may be set from now. */
export const TRIAL_EXTEND_MAX_ABSOLUTE_DAYS = 365;

/**
 * Base = max(now, current trialEndsAt ?? now). Active trials grow from current end;
 * expired trials restart from now.
 */
export function computeExtendedTrialEndsAt(
  now: Date,
  currentTrialEndsAt: Date | null | undefined,
  extendDays: number
): Date {
  const current = currentTrialEndsAt ?? now;
  const base = current.getTime() > now.getTime() ? current : now;
  const result = new Date(base);
  result.setDate(result.getDate() + extendDays);
  return result;
}

export function assertTrialEndsAtAllowed(now: Date, trialEndsAt: Date): void {
  if (!(trialEndsAt.getTime() > now.getTime())) {
    throw new Error("trialEndsAt must be in the future");
  }
  const max = new Date(now);
  max.setDate(max.getDate() + TRIAL_EXTEND_MAX_ABSOLUTE_DAYS);
  if (trialEndsAt.getTime() > max.getTime()) {
    throw new Error(`trialEndsAt must be within ${TRIAL_EXTEND_MAX_ABSOLUTE_DAYS} days`);
  }
}
