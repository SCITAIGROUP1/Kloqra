"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createQueryClient } from "./query-client";
import { useTimelogQuerySync } from "./use-timelog-query-sync";

let queryClient: ReturnType<typeof createQueryClient> | undefined;

function getOrCreateQueryClient() {
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
}

function TimelogQuerySync() {
  useTimelogQuerySync();
  return null;
}

export function AppQueryProvider({ children }: { children: ReactNode }) {
  const client = getOrCreateQueryClient();
  return (
    <QueryClientProvider client={client}>
      <TimelogQuerySync />
      {children}
    </QueryClientProvider>
  );
}
