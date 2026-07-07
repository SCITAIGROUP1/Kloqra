"use client";

import { useEffect, useRef } from "react";
import { readUserIdFromToken } from "../auth/jwt-payload";
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
  subscribeNotificationConnection,
  subscribeNotificationPush,
  subscribeWorkspaceDataStale
} from "../realtime/notification-socket-manager";
import {
  invalidateWorkspaceData,
  scopesForNotificationType
} from "../realtime/workspace-data-sync";
import { useNotificationsStore } from "../stores/notifications-store";
import { getAccessToken } from "../stores/session.store";

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

    const unsubStale = subscribeWorkspaceDataStale((payload) => {
      invalidateWorkspaceData(payload.workspaceId, payload.scopes);
    });

    const unsubConn = subscribeNotificationConnection((state) => {
      const connected = state === "connected";
      setSocketConnected(connected);
      if (connected && workspaceId) {
        const userId = readUserIdFromToken(getAccessToken());
        if (userId) {
          void refreshUnread(userId, workspaceId);
        }
        if (hadConnectedRef.current) {
          invalidateWorkspaceData(workspaceId, [
            "submissions",
            "timesheet",
            "timelogs",
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
      unsubStale();
      unsubConn();
      disconnectNotificationSocket();
      hadConnectedRef.current = false;
    };
  }, [enabled, workspaceId, applyPush, setSocketConnected, refreshUnread]);
}
