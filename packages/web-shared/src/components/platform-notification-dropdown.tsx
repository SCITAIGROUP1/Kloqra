"use client";

import type { PlatformNotificationDto } from "@kloqra/contracts";
import { AppBarIconButton, cn } from "@kloqra/ui";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NotificationDetails } from "../features/notifications/notification-ui";
import {
  iconForPlatformNotificationType,
  platformNotificationVariantClass
} from "../features/platform-notifications/platform-notification-ui";
import {
  formatPlatformNotificationTimeAgo,
  markAllPlatformNotificationsRead,
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
  const router = useRouter();
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

  async function handleActivate(item: PlatformNotificationDto) {
    const href = item.metadata?.href;
    setOpen(false);
    if (href) router.push(href);
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
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
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
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications
              </p>
            ) : (
              notifications.map((item) => {
                const Icon = iconForPlatformNotificationType(item.type, item.title);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left hover:bg-muted/40",
                      !item.readAt && "bg-primary/5",
                      platformNotificationVariantClass(item.metadata)
                    )}
                    onClick={() => void handleActivate(item)}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.body}</p>
                      <NotificationDetails details={item.metadata?.details} />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatPlatformNotificationTimeAgo(item.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-border px-4 py-2">
            <Link
              href={viewAllHref}
              className="block py-2 text-center text-sm font-medium text-primary hover:underline"
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
