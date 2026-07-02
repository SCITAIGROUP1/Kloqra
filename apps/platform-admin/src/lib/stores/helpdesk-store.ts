import { create } from "zustand";

interface TicketListItemDto {
  id: string;
  ticketNumber: number;
  subject: string;
  status: string;
  priority: string;
  channel: string;
  requesterName: string;
  requesterEmail: string;
  queueName: string;
  assignedToName?: string;
  slaBreached: boolean;
  firstResponseDue: string | null;
  resolutionDue: string | null;
  createdAt: string;
}

interface HelpdeskStore {
  tickets: TicketListItemDto[];
  setTickets: (tickets: TicketListItemDto[]) => void;
  // TODO: add filters and active ticket
}

export const useHelpdeskStore = create<HelpdeskStore>((set) => ({
  tickets: [],
  setTickets: (tickets) => set({ tickets })
}));
