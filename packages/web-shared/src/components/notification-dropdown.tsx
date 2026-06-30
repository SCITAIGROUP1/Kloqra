"use client";

import type { NotificationDto, NotificationType } from "@kloqra/contracts";
import { AppBarIconButton, cn } from "@kloqra/ui";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { activateNotification } from "../features/notifications/notification-actions";
import {
  NotificationDetails,
  iconForNotificationType,
  notificationRowClass
} from "../features/notifications/notification-ui";
import {
  formatNotificationTimeAgo,
  markAllNotificationsRead,
  useNotificationUnreadCount,
  useRecentNotifications
} from "../hooks/use-notifications";
import { useNotificationsStore } from "../stores/notifications-store";

function NotificationIcon({ type, title }: { type: NotificationType; title?: string | null }) {
  const Icon = iconForNotificationType(type, title);
  return <Icon className="size-4 shrink-0 text-primary" aria-hidden />;
}

export type NotificationDropdownProps = {
  workspaceId: string;
  viewAllHref?: string;
  className?: string;
};

export function NotificationDropdown({
  workspaceId,
  viewAllHref = "/notifications",
  className
}: NotificationDropdownProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { count: unreadCount, refresh: refreshUnread } = useNotificationUnreadCount(
    workspaceId,
    Boolean(workspaceId)
  );
  const socketConnected = useNotificationsStore((s) => s.socketConnected);
  const { items: notifications, refresh, setItems } = useRecentNotifications(workspaceId);
  const prevUnreadRef = useRef(unreadCount);
  const [unreadPop, setUnreadPop] = useState(false);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setUnreadPop(true);
      const timer = window.setTimeout(() => setUnreadPop(false), 150);
      prevUnreadRef.current = unreadCount;
      return () => window.clearTimeout(timer);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    if (!open) return;
    void refresh();
    void refreshUnread();
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, refresh, refreshUnread]);

  async function markAllRead() {
    await markAllNotificationsRead(workspaceId);
    setItems((items) => items.map((item) => ({ ...item, readAt: new Date().toISOString() })));
    void refreshUnread();
  }

  async function handleItemClick(item: NotificationDto) {
    await activateNotification(workspaceId, item, (href) => {
      setOpen(false);
      router.push(href);
    });
    setItems((items) =>
      items.map((row) =>
        row.id === item.id && !row.readAt ? { ...row, readAt: new Date().toISOString() } : row
      )
    );
    void refreshUnread();
  }

  return (
    <div className={cn("relative", className)} ref={menuRef}>
      <AppBarIconButton
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        title={
          socketConnected ? "Notifications (live updates on)" : "Notifications (reconnecting…)"
        }
        className="relative"
      >
        <Bell strokeWidth={1.5} aria-hidden />
        {socketConnected ? (
          <span
            className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-2 ring-background"
            aria-hidden
          />
        ) : null}
        {unreadCount > 0 ? (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background",
              unreadPop && "animate-unread-pop"
            )}
            aria-label={`${unreadCount} unread`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </AppBarIconButton>

      {open ? (
        <div
          role="menu"
          aria-label="Notifications"
          className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-[22rem] z-50 mt-1.5 overflow-hidden rounded-xl border border-border/80 bg-card shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="shrink-0 text-xs font-medium text-primary hover:underline"
                onClick={() => void markAllRead()}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </li>
            ) : (
              notifications.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className={notificationRowClass(item, "px-4 py-3")}
                    onClick={() => void handleItemClick(item)}
                  >
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <NotificationIcon type={item.type} title={item.title} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        {!item.readAt ? (
                          <span
                            className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                            aria-label="Unread"
                          />
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                      <NotificationDetails details={item.metadata?.details} />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatNotificationTimeAgo(item.createdAt)}
                      </p>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="border-t border-border/70 px-4 py-3 text-center">
            <Link
              href={viewAllHref}
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
