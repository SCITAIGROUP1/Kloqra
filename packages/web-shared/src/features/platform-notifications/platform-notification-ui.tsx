import type { PlatformNotificationDto, PlatformNotificationType } from "@kloqra/contracts";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Bell, Building2, Gauge, Shield } from "lucide-react";

export function iconForPlatformNotificationType(
  type: PlatformNotificationType,
  title?: string | null
): LucideIcon {
  const lowerTitle = title?.toLowerCase() ?? "";
  if (lowerTitle.includes("queue")) return Gauge;
  if (lowerTitle.includes("drift")) return AlertTriangle;
  switch (type) {
    case "TENANT_CREATED":
    case "TENANT_UPDATED":
    case "TENANT_SUSPENDED":
    case "TENANT_CHURNED":
    case "TENANT_DELETED":
      return Building2;
    case "SUBSCRIPTION_DRIFT":
      return AlertTriangle;
    case "QUEUE_FAILURE":
      return Gauge;
    case "SECURITY_ALERT":
      return Shield;
    default:
      return Bell;
  }
}

export function platformNotificationVariantClass(
  metadata?: PlatformNotificationDto["metadata"]
): string {
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
