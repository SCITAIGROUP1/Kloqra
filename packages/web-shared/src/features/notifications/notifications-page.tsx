"use client";

import type { NotificationDto, NotificationType } from "@kloqra/contracts";
import {
  AppBar,
  Badge,
  Button,
  EmptyState,
  SegmentedControl,
  Skeleton,
  TablePagination,
  cn
} from "@kloqra/ui";
import { useRouter } from "next/navigation";
import { useMemo, useState, type KeyboardEvent } from "react";
import {
  formatNotificationTimeAgo,
  markAllNotificationsRead,
  markNotificationRead,
  useNotificationUnreadCount,
  usePaginatedNotifications
} from "../../hooks/use-notifications";
import { activateNotification } from "./notification-actions";
import {
  NotificationDetails,
  iconForNotificationType,
  notificationVariantClass
} from "./notification-ui";

function iconForType(type: NotificationType, title?: string | null) {
  return iconForNotificationType(type, title);
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
  const router = useRouter();
  const Icon = iconForType(item.type, item.title);
  const isUnread = !item.readAt;
  const href = item.metadata?.href;

  async function setRead(read: boolean) {
    await markNotificationRead(workspaceId, item.id, read);
    onUpdated();
  }

  async function handleActivate() {
    await activateNotification(workspaceId, item, href ? router.push.bind(router) : undefined);
    onUpdated();
  }

  const content = (
    <div
      className={cn(
        "flex items-start gap-4 rounded-xl border border-border bg-card p-4",
        "transition-[background-color,border-color,opacity] duration-[var(--motion-base)] ease-[var(--motion-ease-out)]",
        isUnread && "border-primary/30",
        !isUnread && "opacity-90",
        href && "cursor-pointer hover:border-primary/40 hover:bg-muted/30",
        notificationVariantClass(item.metadata)
      )}
      {...(href
        ? {
            role: "button" as const,
            tabIndex: 0,
            onClick: () => void handleActivate(),
            onKeyDown: (event: KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                void handleActivate();
              }
            }
          }
        : {})}
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
          {href ? (
            <Button type="button" size="sm" onClick={() => void handleActivate()}>
              {item.metadata?.ctaLabel ?? "Open"}
            </Button>
          ) : null}
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

  return content;
}

export function NotificationsPage({ workspaceId }: { workspaceId: string }) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { count, refresh: refreshUnread } = useNotificationUnreadCount(workspaceId);
  const { items, page, setPage, total, totalPages, limit, setLimit, loading, reload } =
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
            <Skeleton key={i} className="h-24 rounded-xl" />
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
        <div className="space-y-3 animate-fade-in motion-reduce:animate-none">
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
          onLimitChange={setLimit}
        />
      ) : null}
    </div>
  );
}
