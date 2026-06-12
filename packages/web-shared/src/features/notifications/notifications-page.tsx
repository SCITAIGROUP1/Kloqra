"use client";

import type { NotificationDto, NotificationType } from "@kloqra/contracts";
import {
  AppBar,
  Badge,
  Button,
  EmptyState,
  SegmentedControl,
  TablePagination,
  cn
} from "@kloqra/ui";
import {
  AlertTriangle,
  Bell,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Download,
  FolderKanban,
  Link2,
  Timer,
  Users
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatNotificationTimeAgo,
  markAllNotificationsRead,
  markNotificationRead,
  useNotificationUnreadCount,
  usePaginatedNotifications
} from "../../hooks/use-notifications";
import { NotificationDetails, notificationVariantClass } from "./notification-ui";

function iconForType(type: NotificationType) {
  switch (type) {
    case "PROJECT_ASSIGNMENT":
      return FolderKanban;
    case "TASK_ASSIGNMENT":
      return CheckSquare;
    case "TIMESHEET_REMINDER":
    case "TIMESHEET_STATUS":
      return Clock;
    case "IDLE_TIMER_ALERT":
      return Timer;
    case "JIRA_SYNC_UPDATE":
      return Link2;
    case "APPROVAL_REQUEST":
      return ClipboardCheck;
    case "MEMBER_CHANGE":
    case "WORKSPACE_ADDED":
      return Users;
    case "EXPORT_SCHEDULE":
      return Download;
    case "BUDGET_ALERT":
      return AlertTriangle;
    default:
      return Bell;
  }
}

function NotificationRow({
  item,
  workspaceId,
  onUpdated
}: {
  item: NotificationDto;
  workspaceId: string;
  onUpdated: () => void;
}) {
  const Icon = iconForType(item.type);
  const isUnread = !item.readAt;
  const href = item.metadata?.href;

  async function setRead(read: boolean) {
    await markNotificationRead(workspaceId, item.id, read);
    onUpdated();
  }

  const content = (
    <div
      className={cn(
        "flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-colors",
        isUnread && "border-primary/30",
        notificationVariantClass(item.metadata)
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            <NotificationDetails details={item.metadata?.details} />
            <p className="mt-2 text-xs text-muted-foreground">
              {formatNotificationTimeAgo(item.createdAt)}
            </p>
          </div>
          {isUnread ? (
            <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {isUnread ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void setRead(true)}>
              Mark read
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => void setRead(false)}>
              Mark unread
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-95">
        {content}
      </Link>
    );
  }

  return content;
}

export function NotificationsPage({ workspaceId }: { workspaceId: string }) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { count, refresh: refreshUnread } = useNotificationUnreadCount(workspaceId);
  const { items, page, setPage, total, totalPages, limit, loading, reload } =
    usePaginatedNotifications(workspaceId, { unreadOnly: filter === "unread" });

  const filterOptions = useMemo(
    () => [
      { value: "all" as const, label: "All" },
      { value: "unread" as const, label: `Unread${count > 0 ? ` (${count})` : ""}` }
    ],
    [count]
  );

  async function handleMarkAllRead() {
    await markAllNotificationsRead(workspaceId);
    await Promise.all([reload(), refreshUnread()]);
  }

  function handleUpdated() {
    void Promise.all([reload(), refreshUnread()]);
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Notifications"
        description="View and manage your in-app notifications"
        actions={
          count > 0 ? (
            <Button type="button" size="sm" onClick={() => void handleMarkAllRead()}>
              Mark all read
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl value={filter} onChange={setFilter} options={filterOptions} />
        {count > 0 ? <Badge variant="secondary">{count} unread</Badge> : null}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
          description={
            filter === "unread"
              ? "You're all caught up."
              : "Activity from your workspace will appear here."
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              workspaceId={workspaceId}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
