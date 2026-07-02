import { type Metadata } from "next";
import { type ReactNode } from "react";
export const metadata: Metadata = {
  title: "Help Desk | Kloqra Admin",
  description: "Platform Support & Ticketing"
};
import { HelpDeskSocketProvider } from "@/features/helpdesk/shared/helpdesk-socket-provider";

export default function HelpDeskLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto bg-muted/20">
        <HelpDeskSocketProvider>{children}</HelpDeskSocketProvider>
      </div>
    </div>
  );
}
