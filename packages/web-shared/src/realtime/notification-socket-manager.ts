"use client";

import {
  NOTIFICATION_CREATED_EVENT,
  NOTIFICATIONS_SOCKET_NAMESPACE,
  notificationCreatedEventSchema,
  type NotificationCreatedEvent
} from "@kloqra/contracts";
import { io, type Socket } from "socket.io-client";
import { getApiBase } from "../api/base";
import { subscribeSessionUpdates } from "../auth/auth-channel";
import { getAccessToken } from "../stores/session.store";

export type NotificationSocketConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected";

type PushHandler = (payload: NotificationCreatedEvent) => void;
type ConnectionHandler = (state: NotificationSocketConnectionState) => void;

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

let socket: Socket | null = null;
let connectionState: NotificationSocketConnectionState = "idle";
let activeConsumers = 0;
let currentToken: string | null = null;
const pushHandlers = new Set<PushHandler>();
const connectionHandlers = new Set<ConnectionHandler>();
let sessionUnsub: (() => void) | null = null;

function setConnectionState(state: NotificationSocketConnectionState): void {
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
  nextSocket.on(NOTIFICATION_CREATED_EVENT, (raw: unknown) => {
    const parsed = notificationCreatedEventSchema.safeParse(raw);
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

function ensureSessionSubscription(): void {
  if (sessionUnsub) return;
  sessionUnsub = subscribeSessionUpdates((_session, accessToken) => {
    if (activeConsumers === 0) return;
    if (accessToken) {
      connectWithToken(accessToken);
    }
  });
}

/** Opens (or reuses) the shared notification socket for this browser tab. */
export function connectNotificationSocket(): void {
  activeConsumers += 1;
  ensureSessionSubscription();
  const token = getAccessToken();
  if (token) {
    connectWithToken(token);
  }
}

/** Decrements consumer count; disconnects when no shell is mounted. */
export function disconnectNotificationSocket(): void {
  activeConsumers = Math.max(0, activeConsumers - 1);
  if (activeConsumers > 0) return;
  if (sessionUnsub) {
    sessionUnsub();
    sessionUnsub = null;
  }
  disconnectSocketOnly();
  setConnectionState("idle");
}

/** Forces disconnect (e.g. logout) regardless of consumer count. */
export function forceDisconnectNotificationSocket(): void {
  activeConsumers = 0;
  if (sessionUnsub) {
    sessionUnsub();
    sessionUnsub = null;
  }
  disconnectSocketOnly();
  setConnectionState("idle");
}

export function subscribeNotificationPush(handler: PushHandler): () => void {
  pushHandlers.add(handler);
  return () => pushHandlers.delete(handler);
}

export function subscribeNotificationConnection(handler: ConnectionHandler): () => void {
  handler(connectionState);
  connectionHandlers.add(handler);
  return () => connectionHandlers.delete(handler);
}

export function getNotificationSocketConnectionState(): NotificationSocketConnectionState {
  return connectionState;
}
