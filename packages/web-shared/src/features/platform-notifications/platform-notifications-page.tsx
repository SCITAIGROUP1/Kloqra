"use client";

import type { PlatformNotificationDto } from "@kloqra/contracts";
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
  formatPlatformNotificationTimeAgo,
  markAllPlatformNotificationsRead,
  markPlatformNotificationRead,
  usePaginatedPlatformNotifications,
  usePlatformNotificationUnreadCount
} from "../../hooks/use-platform-notifications";
import { NotificationDetails } from "../notifications/notification-ui";
import {
  iconForPlatformNotificationType,
  platformNotificationVariantClass
} from "./platform-notification-ui";

function PlatformNotificationRow({
  item,
  onUpdated
}: {
  item: PlatformNotificationDto;
  onUpdated: () => void;
}) {
  const router = useRouter();
  const Icon = iconForPlatformNotificationType(item.type, item.title);
  const isUnread = !item.readAt;
  const href = item.metadata?.href;

  async function setRead(read: boolean) {
    await markPlatformNotificationRead(item.id, read);
    onUpdated();
  }

  async function handleActivate() {
    if (href) {
      if (!item.readAt) {
        await markPlatformNotificationRead(item.id, true);
      }
      router.push(href);
    }
    onUpdated();
  }

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-xl border border-border bg-card p-4",
        isUnread && "border-primary/30",
        !isUnread && "opacity-90",
        href && "cursor-pointer hover:border-primary/40 hover:bg-muted/30",
        platformNotificationVariantClass(item.metadata)
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
              {formatPlatformNotificationTimeAgo(item.createdAt)}
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
}

export function PlatformNotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { count, refresh: refreshUnread } = usePlatformNotificationUnreadCount();
  const { items, page, setPage, total, totalPages, limit, setLimit, loading, reload } =
    usePaginatedPlatformNotifications({ unreadOnly: filter === "unread" });

  const filterOptions = useMemo(
    () => [
      { value: "all" as const, label: "All" },
      { value: "unread" as const, label: `Unread${count > 0 ? ` (${count})` : ""}` }
    ],
    [count]
  );

  async function handleMarkAllRead() {
    await markAllPlatformNotificationsRead();
    await Promise.all([reload(), refreshUnread()]);
  }

  function handleUpdated() {
    void Promise.all([reload(), refreshUnread()]);
  }

  const filteredItems = items;

  return (
    <div className="space-y-6">
      <AppBar
        title="Notifications"
        description="Platform operations alerts and fleet events"
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
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
          description={
            filter === "unread"
              ? "You're all caught up."
              : "Tenant lifecycle and ops alerts will appear here."
          }
        />
      ) : (
        <div className="space-y-3 animate-fade-in motion-reduce:animate-none">
          {filteredItems.map((item) => (
            <PlatformNotificationRow key={item.id} item={item} onUpdated={handleUpdated} />
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
