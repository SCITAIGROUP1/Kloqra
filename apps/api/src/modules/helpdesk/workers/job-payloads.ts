import { TicketChannel, TicketType, TicketPriority } from "@prisma/client";

export interface IngestTicketJobPayload {
  channel: TicketChannel;
  ticketType: TicketType;
  subject: string;
  body: string;
  htmlBody?: string;
  requesterName: string;
  requesterEmail: string;
  tenantId?: string;
  emailMessageId?: string;
  attachments?: any[];
  suggestedQueueSlug?: string;
  /** Type-specific extra fields stored as JSON metadata */
  metadata?: Record<string, unknown>;
  /** Explicit priority override — if not set, derived from ticketType */
  explicitPriority?: TicketPriority;
}
