"use client";

import type { PlatformNotificationDto } from "@kloqra/contracts";
import { AppBarIconButton, cn } from "@kloqra/ui";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NotificationDetails } from "../features/notifications/notification-ui";
import {
  iconForPlatformNotificationType,
  platformNotificationVariantClass
} from "../features/platform-notifications/platform-notification-ui";
import {
  formatPlatformNotificationTimeAgo,
  markAllPlatformNotificationsRead,
  markPlatformNotificationRead,
  usePlatformNotificationUnreadCount,
  useRecentPlatformNotifications
} from "../hooks/use-platform-notifications";
import { usePlatformNotificationsStore } from "../stores/platform-notifications-store";

export function PlatformNotificationDropdown({
  viewAllHref = "/notifications",
  className
}: {
  viewAllHref?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { count: unreadCount, refresh: refreshUnread } = usePlatformNotificationUnreadCount();
  const socketConnected = usePlatformNotificationsStore((s) => s.socketConnected);
  const { items: notifications, refresh, setItems } = useRecentPlatformNotifications(8);
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
  }, [open, refresh]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleItemClick(item: PlatformNotificationDto) {
    if (!item.readAt) {
      await markPlatformNotificationRead(item.id, true);
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row))
      );
      void refreshUnread();
    }
  }

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <AppBarIconButton
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        onClick={() => setOpen((value) => !value)}
        className={cn(unreadPop && "animate-pulse")}
      >
        <Bell strokeWidth={1.5} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
        {!socketConnected && unreadCount === 0 ? (
          <span className="absolute bottom-0 right-0 size-1.5 rounded-full bg-muted-foreground/50" />
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
                onClick={() =>
                  void markAllPlatformNotificationsRead().then(() => {
                    void refreshUnread();
                    setItems((prev) =>
                      prev.map((item) => ({ ...item, readAt: new Date().toISOString() }))
                    );
                  })
                }
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
              notifications.map((item) => {
                const Icon = iconForPlatformNotificationType(item.type, item.title);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                        !item.readAt && "bg-primary/5",
                        platformNotificationVariantClass(item.metadata)
                      )}
                      onClick={() => void handleItemClick(item)}
                    >
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="size-4 shrink-0 text-primary" aria-hidden />
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
                          {formatPlatformNotificationTimeAgo(item.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })
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
