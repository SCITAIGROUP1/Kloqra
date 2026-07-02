import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";

export interface HelpdeskTicketListItem {
  id: string;
  ticketNumber: number;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ON_HOLD";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "URGENT";
  channel: "WEB_FORM" | "EMAIL" | "PLATFORM_ADMIN" | "API";
  requesterName: string;
  requesterEmail: string;
  queueName: string;
  assignedToName?: string;
  assignedToId?: string;
  createdAt: string;
  tenant?: { name: string } | null;
  ticketType:
    | "BUG_REPORT"
    | "BILLING"
    | "PLAN_QUESTION"
    | "FEATURE_REQUEST"
    | "IN_APP_REPORT"
    | "SECURITY"
    | "GENERAL";
}

export interface HelpdeskTicketsFilters {
  search?: string;
  status?: string;
  channel?: string;
  assignee?: string;
}

export function useHelpdeskTickets(initialFilters?: HelpdeskTicketsFilters) {
  const [tickets, setTickets] = useState<HelpdeskTicketListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(initialFilters?.search ?? "");
  const [statusFilter, setStatusFilter] = useState(initialFilters?.status ?? "ALL");
  const [channelFilter, setChannelFilter] = useState(initialFilters?.channel ?? "ALL");
  const [assigneeFilter, setAssigneeFilter] = useState(initialFilters?.assignee ?? "ALL");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (search) query.append("search", search);
      if (statusFilter && statusFilter !== "ALL") query.append("status", statusFilter);
      if (channelFilter && channelFilter !== "ALL") query.append("channel", channelFilter);
      if (assigneeFilter && assigneeFilter !== "ALL") query.append("assignee", assigneeFilter);

      const res = await api<{
        data: HelpdeskTicketListItem[];
        total: number;
        totalPages: number;
      }>(`/platform/helpdesk/tickets?${query.toString()}`);
      setTickets(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, channelFilter, assigneeFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, channelFilter, assigneeFilter, limit]);

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
    assigneeFilter,
    setAssigneeFilter,
    reload: fetchTickets
  };
}
