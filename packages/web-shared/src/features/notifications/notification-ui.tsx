import type { NotificationDto } from "@kloqra/contracts";
import { cn } from "@kloqra/ui";

export function notificationVariantClass(metadata?: NotificationDto["metadata"]): string {
  switch (metadata?.variant) {
    case "success":
      return "border-emerald-500/30 bg-emerald-500/5";
    case "attention":
      return "border-amber-500/30 bg-amber-500/5";
    case "warning":
      return "border-destructive/30 bg-destructive/5";
    case "info":
      return "border-primary/30 bg-primary/5";
    default:
      return "";
  }
}

export function notificationRowClass(item: NotificationDto, extra?: string): string {
  return cn(
    "flex w-full items-start gap-3 text-left transition-colors hover:bg-muted/40",
    !item.readAt && "bg-primary/5",
    notificationVariantClass(item.metadata),
    extra
  );
}

export function NotificationDetails({
  details
}: {
  details?: NonNullable<NotificationDto["metadata"]>["details"];
}) {
  if (!details?.length) return null;
  return (
    <ul className="mt-2 space-y-0.5">
      {details.map((row) => (
        <li key={`${row.label}-${row.value}`} className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/80">{row.label}:</span> {row.value}
        </li>
      ))}
    </ul>
  );
}
