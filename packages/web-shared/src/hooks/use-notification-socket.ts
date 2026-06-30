"use client";

import { useEffect, useRef } from "react";
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
  subscribeNotificationConnection,
  subscribeNotificationPush
} from "../realtime/notification-socket-manager";
import {
  invalidateWorkspaceData,
  scopesForNotificationType
} from "../realtime/workspace-data-sync";
import { useNotificationsStore } from "../stores/notifications-store";

export function useNotificationSocket(workspaceId: string, enabled = true) {
  const applyPush = useNotificationsStore((s) => s.applyNotificationPush);
  const setSocketConnected = useNotificationsStore((s) => s.setSocketConnected);
  const refreshUnread = useNotificationsStore((s) => s.refreshUnread);
  const hadConnectedRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const unsubPush = subscribeNotificationPush((payload) => {
      applyPush(payload);
      const scopes = scopesForNotificationType(payload.notification.type);
      if (payload.workspaceId) {
        invalidateWorkspaceData(payload.workspaceId, scopes);
      }
    });

    const unsubConn = subscribeNotificationConnection((state) => {
      const connected = state === "connected";
      setSocketConnected(connected);
      if (connected && workspaceId) {
        void refreshUnread(workspaceId);
        if (hadConnectedRef.current) {
          invalidateWorkspaceData(workspaceId, [
            "submissions",
            "timesheet",
            "projects",
            "tasks",
            "pending_approvals"
          ]);
        }
        hadConnectedRef.current = true;
      }
    });

    connectNotificationSocket();

    return () => {
      unsubPush();
      unsubConn();
      disconnectNotificationSocket();
      hadConnectedRef.current = false;
    };
  }, [enabled, workspaceId, applyPush, setSocketConnected, refreshUnread]);
}
