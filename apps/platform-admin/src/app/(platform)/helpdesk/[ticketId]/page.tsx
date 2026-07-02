import { TicketDetailPage } from "@/features/helpdesk/ticket-detail/ticket-detail-page";

export default async function TicketRoute({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  return <TicketDetailPage ticketId={ticketId} />;
}
