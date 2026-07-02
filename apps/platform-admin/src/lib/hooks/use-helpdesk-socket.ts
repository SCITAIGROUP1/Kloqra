import { usePlatformSessionStore, getPlatformAccessToken } from "@kloqra/web-shared";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useHelpdeskStore } from "../stores/helpdesk-store";

let socket: Socket | null = null;

export function useHelpdeskSocket() {
  const session = usePlatformSessionStore((s) => s.session);

  useEffect(() => {
    const token = getPlatformAccessToken();
    if (!token) return;

    if (!socket) {
      socket = io(`${process.env.NEXT_PUBLIC_API_URL || ""}/helpdesk`, {
        auth: { token, scope: "platform" },
        withCredentials: true
      });

      socket.on("connect", () => {
        // Connected to HelpDesk real-time updates
      });

      socket.on("ticket_created", (ticket) => {
        useHelpdeskStore.setState((state) => ({
          tickets: [ticket, ...state.tickets]
        }));
      });

      socket.on("ticket_updated", (ticket) => {
        useHelpdeskStore.setState((state) => ({
          tickets: state.tickets.map((t) => (t.id === ticket.id ? ticket : t))
        }));
      });

      socket.on("new_message", ({ ticketId: _ticketId, message: _message }) => {
        // TODO: update active ticket messages if viewing
      });
    }

    return () => {
      // Intentionally keeping socket alive for the session
    };
  }, [session]);
}
