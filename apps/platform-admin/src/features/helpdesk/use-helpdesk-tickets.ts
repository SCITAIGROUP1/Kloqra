import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";

export interface HelpdeskTicketsFilters {
  search?: string;
  status?: string;
  channel?: string;
}

export function useHelpdeskTickets(initialFilters?: HelpdeskTicketsFilters) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(initialFilters?.search ?? "");
  const [statusFilter, setStatusFilter] = useState(initialFilters?.status ?? "ALL");
  const [channelFilter, setChannelFilter] = useState(initialFilters?.channel ?? "ALL");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) query.append("search", search);
      if (statusFilter && statusFilter !== "ALL") query.append("status", statusFilter);
      if (channelFilter && channelFilter !== "ALL") query.append("channel", channelFilter);

      const res = await api<any>(`/platform/helpdesk/tickets?${query.toString()}`);
      setTickets(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.message || "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, channelFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, channelFilter, limit]);

  return {
    tickets,
    total,
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    channelFilter,
    setChannelFilter,
    reload: fetchTickets,
  };
}
