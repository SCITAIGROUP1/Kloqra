"use client";

import {
  NOTIFICATIONS_SOCKET_NAMESPACE,
  PLATFORM_NOTIFICATION_CREATED_EVENT,
  platformNotificationCreatedEventSchema
} from "@kloqra/contracts";
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { getApiBase } from "../api/base";
import { tryRefreshPlatformSession } from "../auth/bootstrap-platform-session";
import { usePlatformNotificationsStore } from "../stores/platform-notifications-store";
import { getPlatformAccessToken } from "../stores/platform-session.store";

export type PlatformNotificationSocketConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected";

type PushHandler = ReturnType<typeof platformNotificationCreatedEventSchema.parse>;
type ConnectionHandler = (state: PlatformNotificationSocketConnectionState) => void;

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "platform";

let socket: Socket | null = null;
let connectionState: PlatformNotificationSocketConnectionState = "idle";
let activeConsumers = 0;
let currentToken: string | null = null;
const pushHandlers = new Set<(payload: PushHandler) => void>();
const connectionHandlers = new Set<ConnectionHandler>();

function setConnectionState(state: PlatformNotificationSocketConnectionState): void {
  if (connectionState === state) return;
  connectionState = state;
  for (const handler of connectionHandlers) {
    handler(state);
  }
}

function attachSocketListeners(nextSocket: Socket): void {
  nextSocket.on("connect", () => setConnectionState("connected"));
  nextSocket.on("disconnect", () => {
    setConnectionState(activeConsumers > 0 ? "disconnected" : "idle");
  });
  nextSocket.on("connect_error", () => setConnectionState("disconnected"));
  nextSocket.on(PLATFORM_NOTIFICATION_CREATED_EVENT, (raw: unknown) => {
    const parsed = platformNotificationCreatedEventSchema.safeParse(raw);
    if (!parsed.success) return;
    for (const handler of pushHandlers) {
      handler(parsed.data);
    }
  });
}

function disconnectSocketOnly(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  currentToken = null;
}

function connectWithToken(token: string): void {
  if (socket?.connected && currentToken === token) return;

  disconnectSocketOnly();
  currentToken = token;
  setConnectionState("connecting");

  socket = io(`${getApiBase()}${NOTIFICATIONS_SOCKET_NAMESPACE}`, {
    auth: { token, scope: AUTH_SCOPE },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelayMax: 10_000
  });
  attachSocketListeners(socket);
}

export function connectPlatformNotificationSocket(): void {
  activeConsumers += 1;
  const token = getPlatformAccessToken();
  if (token) {
    connectWithToken(token);
  }
}

export function disconnectPlatformNotificationSocket(): void {
  activeConsumers = Math.max(0, activeConsumers - 1);
  if (activeConsumers > 0) return;
  disconnectSocketOnly();
  setConnectionState("idle");
}

export function subscribePlatformNotificationPush(
  handler: (payload: PushHandler) => void
): () => void {
  pushHandlers.add(handler);
  return () => pushHandlers.delete(handler);
}

export function subscribePlatformNotificationConnection(handler: ConnectionHandler): () => void {
  connectionHandlers.add(handler);
  handler(connectionState);
  return () => connectionHandlers.delete(handler);
}

export async function refreshPlatformNotificationSocketToken(): Promise<void> {
  const token = (await tryRefreshPlatformSession()) ?? getPlatformAccessToken();
  if (token && activeConsumers > 0) {
    connectWithToken(token);
  }
}

export function usePlatformNotificationSocket(enabled = true) {
  const applyPush = usePlatformNotificationsStore((s) => s.applyNotificationPush);
  const setSocketConnected = usePlatformNotificationsStore((s) => s.setSocketConnected);
  const refreshUnread = usePlatformNotificationsStore((s) => s.refreshUnread);
  const hadConnectedRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const unsubPush = subscribePlatformNotificationPush((payload) => {
      applyPush(payload);
    });

    const unsubConn = subscribePlatformNotificationConnection((state) => {
      const connected = state === "connected";
      setSocketConnected(connected);
      if (connected) {
        void refreshUnread();
        hadConnectedRef.current = true;
      }
    });

    connectPlatformNotificationSocket();

    return () => {
      unsubPush();
      unsubConn();
      disconnectPlatformNotificationSocket();
      hadConnectedRef.current = false;
    };
  }, [enabled, applyPush, setSocketConnected, refreshUnread]);
}
