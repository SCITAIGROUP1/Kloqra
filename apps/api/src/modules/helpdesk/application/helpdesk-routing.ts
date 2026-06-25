import { TicketPriority, TicketType } from "@prisma/client";

/**
 * Maps each ticket type to the slug of the queue it should land in.
 * Queues are created by the seed. If a queue doesn't exist, the ingest
 * worker falls back to the first available queue.
 */
export const TICKET_TYPE_QUEUE: Record<TicketType, string> = {
  BUG_REPORT:      "technical-support",
  IN_APP_REPORT:   "technical-support",
  BILLING:         "billing-accounts",
  PLAN_QUESTION:   "billing-accounts",
  FEATURE_REQUEST: "product-feedback",
  SECURITY:        "security-response",
  GENERAL:         "general-support",
};

/**
 * Default priority per ticket type, before any metadata-based escalation.
 */
export const TICKET_TYPE_DEFAULT_PRIORITY: Record<TicketType, TicketPriority> = {
  SECURITY:        TicketPriority.CRITICAL,
  BUG_REPORT:      TicketPriority.HIGH,
  BILLING:         TicketPriority.HIGH,
  IN_APP_REPORT:   TicketPriority.MEDIUM,
  PLAN_QUESTION:   TicketPriority.MEDIUM,
  FEATURE_REQUEST: TicketPriority.LOW,
  GENERAL:         TicketPriority.LOW,
};

/**
 * Resolve the final priority, optionally escalating based on metadata.
 * E.g. a BILLING ticket with billingIssueType=payment_failed → CRITICAL.
 * A BUG_REPORT with severity=critical → CRITICAL.
 */
export function resolveTicketPriority(
  ticketType: TicketType,
  metadata: Record<string, unknown> | undefined,
  explicitOverride?: TicketPriority
): TicketPriority {
  if (explicitOverride) return explicitOverride;

  const base = TICKET_TYPE_DEFAULT_PRIORITY[ticketType];

  if (metadata) {
    // Bug severity escalation
    if (ticketType === "BUG_REPORT" && metadata["severity"] === "critical") {
      return TicketPriority.CRITICAL;
    }
    // Billing payment failed escalation
    if (
      ticketType === "BILLING" &&
      (metadata["billingIssueType"] === "payment_failed" ||
        metadata["billingIssueType"] === "charge_dispute")
    ) {
      return TicketPriority.CRITICAL;
    }
  }

  return base;
}

/**
 * Per-type SLA overrides (minutes). Falls back to queue-level slaPolicy if not set.
 */
export const TICKET_TYPE_SLA_MINUTES: Record<
  TicketType,
  { firstResponseMinutes: number; resolutionMinutes: number }
> = {
  SECURITY:        { firstResponseMinutes: 15,   resolutionMinutes: 120 },
  BILLING:         { firstResponseMinutes: 120,  resolutionMinutes: 240 },
  BUG_REPORT:      { firstResponseMinutes: 60,   resolutionMinutes: 480 },
  IN_APP_REPORT:   { firstResponseMinutes: 120,  resolutionMinutes: 720 },
  PLAN_QUESTION:   { firstResponseMinutes: 240,  resolutionMinutes: 1440 },
  FEATURE_REQUEST: { firstResponseMinutes: 480,  resolutionMinutes: 4320 },
  GENERAL:         { firstResponseMinutes: 480,  resolutionMinutes: 2880 },
};
