import type { AuthSessionDto } from "@kloqra/contracts";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

export type AuthChannelMessage = {
  type: "session-updated";
  session: AuthSessionDto;
  accessToken: string;
};

function channelName(): string {
  return `cm-auth-${AUTH_SCOPE}`;
}

export function broadcastSessionUpdate(session: AuthSessionDto, accessToken: string): void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(channelName());
    channel.postMessage({
      type: "session-updated",
      session,
      accessToken
    } satisfies AuthChannelMessage);
    channel.close();
  } catch {
    /* ignore */
  }
}

export function subscribeSessionUpdates(
  onUpdate: (session: AuthSessionDto, accessToken: string) => void
): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return () => undefined;
  }
  const channel = new BroadcastChannel(channelName());
  channel.onmessage = (event: MessageEvent<AuthChannelMessage>) => {
    if (event.data?.type === "session-updated" && event.data.accessToken) {
      onUpdate(event.data.session, event.data.accessToken);
    }
  };
  return () => channel.close();
}
