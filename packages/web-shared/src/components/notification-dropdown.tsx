"use client";

import { AppBarIconButton, cn } from "@kloqra/ui";
import { Bell, Clock, FolderKanban } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  read: boolean;
  icon: "clock" | "folder" | "bell";
};

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    title: "Timesheet Approved",
    description: "Your timesheet for Week 23 has been approved",
    timeAgo: "5 min ago",
    read: false,
    icon: "clock"
  },
  {
    id: "n2",
    title: "New Project Assigned",
    description: 'You have been added to "Website Redesign" project',
    timeAgo: "1 hour ago",
    read: false,
    icon: "folder"
  },
  {
    id: "n3",
    title: "Time Entry Reminder",
    description: "Please submit your timesheet for this week",
    timeAgo: "3 hours ago",
    read: true,
    icon: "bell"
  }
];

function NotificationIcon({ type }: { type: NotificationItem["icon"] }) {
  const className = "size-4 shrink-0 text-primary";
  if (type === "folder") return <FolderKanban className={className} aria-hidden />;
  if (type === "bell") return <Bell className={className} aria-hidden />;
  return <Clock className={className} aria-hidden />;
}

export type NotificationDropdownProps = {
  settingsHref?: string;
  className?: string;
};

export function NotificationDropdown({
  settingsHref = "/settings?section=notifications",
  className
}: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const menuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function markAllRead() {
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  }

  function markRead(id: string) {
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }

  return (
    <div className={cn("relative", className)} ref={menuRef}>
      <AppBarIconButton
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Notifications"
        className="relative"
      >
        <Bell strokeWidth={1.5} aria-hidden />
        {unreadCount > 0 ? (
          <span
            className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background"
            aria-hidden
          />
        ) : null}
      </AppBarIconButton>

      {open ? (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-1.5 w-[22rem] overflow-hidden rounded-xl border border-border/80 bg-card shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
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
                onClick={markAllRead}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="menuitem"
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                    !item.read && "bg-primary/5"
                  )}
                  onClick={() => markRead(item.id)}
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <NotificationIcon type={item.icon} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      {!item.read ? (
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{item.timeAgo}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-border/70 px-4 py-3 text-center">
            <Link
              href={settingsHref}
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
