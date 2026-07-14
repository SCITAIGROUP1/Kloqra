/** Client-side preview for confirm dialogs — mirrors server `computeExtendedTrialEndsAt`. */
export function previewTrialEndsAtFromDays(
  currentTrialEndsAt: string | null | undefined,
  extendDays: number,
  now: Date = new Date()
): Date {
  const current = currentTrialEndsAt ? new Date(currentTrialEndsAt) : now;
  const base = current.getTime() > now.getTime() ? current : now;
  const result = new Date(base);
  result.setDate(result.getDate() + extendDays);
  return result;
}
