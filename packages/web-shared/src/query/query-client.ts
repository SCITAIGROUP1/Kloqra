import { QueryClient } from "@tanstack/react-query";

let browserQueryClient: QueryClient | undefined;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: 1
      }
    }
  });
}

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return createQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }
  return browserQueryClient;
}

export function resetQueryClient(): void {
  browserQueryClient?.clear();
  browserQueryClient = undefined;
}
