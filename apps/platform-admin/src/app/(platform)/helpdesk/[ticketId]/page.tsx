import { TicketDetailPage } from "@/features/helpdesk/ticket-detail/ticket-detail-page";

export default function TicketRoute({ params }: { params: { ticketId: string } }) {
  return <TicketDetailPage ticketId={params.ticketId} />;
}
