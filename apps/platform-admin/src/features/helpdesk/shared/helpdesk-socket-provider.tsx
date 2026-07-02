"use client";

import { type ReactNode } from "react";
import { useHelpdeskSocket } from "@/lib/hooks/use-helpdesk-socket";

export function HelpDeskSocketProvider({ children }: { children: ReactNode }) {
  useHelpdeskSocket();
  return <>{children}</>;
}
