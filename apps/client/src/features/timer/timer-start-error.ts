export function resolveTimerStartErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("timer already running") || lower.includes("another workspace")) {
    return message.includes("another workspace")
      ? message
      : "A timer is already running. Stop it first.";
  }
  return message;
}
