export function formatLastActive(iso: string | null, isTrackingNow: boolean): string {
  if (isTrackingNow) return "Now";
  if (!iso) return "Never";

  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(iso).toLocaleDateString();
}

export function formatWeekHours(hours: number): string {
  if (hours === 0) return "0h";
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded}h`;
}
