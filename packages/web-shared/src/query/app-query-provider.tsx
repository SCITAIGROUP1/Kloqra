"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { getQueryClient } from "./query-client";
import { useTimelogQuerySync } from "./use-timelog-query-sync";

function TimelogQuerySync() {
  useTimelogQuerySync();
  return null;
}

export function AppQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => getQueryClient());
  return (
    <QueryClientProvider client={client}>
      <TimelogQuerySync />
      {children}
    </QueryClientProvider>
  );
}
