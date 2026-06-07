type MessageHandler = (channel: string, message: string) => void;

/** In-process Redis substitute for local dev without Docker. */
export class MemoryRedis {
  private store = new Map<string, string>();
  private channels = new Map<string, Set<MessageHandler>>();

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string) {
    this.store.set(key, value);
    return "OK";
  }

  async setex(key: string, _seconds: number, value: string) {
    this.store.set(key, value);
    return "OK";
  }

  async del(key: string) {
    return this.store.delete(key) ? 1 : 0;
  }

  async keys(pattern: string) {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return Array.from(this.store.keys()).filter((k) => regex.test(k));
  }

  async publish(channel: string, message: string) {
    const handlers = this.channels.get(channel);
    handlers?.forEach((h) => h(channel, message));
    return handlers?.size ?? 0;
  }

  /** Health-check compatibility — always returns "PONG". */
  async ping(): Promise<string> {
    return "PONG";
  }

  duplicate() {
    const localHandlers = new Set<MessageHandler>();
    const subscribed = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- redis duplicate() pattern
    const parent = this;

    const attach = (handler: MessageHandler) => {
      for (const ch of subscribed) {
        if (!parent.channels.has(ch)) parent.channels.set(ch, new Set());
        parent.channels.get(ch)!.add(handler);
      }
    };

    return {
      async subscribe(channel: string) {
        subscribed.add(channel);
        localHandlers.forEach(attach);
      },
      on(event: string, handler: MessageHandler) {
        if (event !== "message") return;
        localHandlers.add(handler);
        attach(handler);
      },
      async unsubscribe(channel?: string) {
        const channels = channel ? [channel] : [...subscribed];
        for (const ch of channels) {
          subscribed.delete(ch);
          const set = parent.channels.get(ch);
          if (set) localHandlers.forEach((h) => set.delete(h));
        }
      },
      async quit() {
        for (const ch of subscribed) {
          const set = parent.channels.get(ch);
          if (set) localHandlers.forEach((h) => set.delete(h));
        }
      }
    };
  }

  async quit() {}
}
