type MessageHandler = (channel: string, message: string) => void;

/** In-process Redis substitute for local dev without Docker. */
export class MemoryRedis {
  private store = new Map<string, string>();
  private channels = new Map<string, Set<MessageHandler>>();

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, ...args: any[]) {
    if (args.includes("NX") || args.includes("nx")) {
      if (this.store.has(key)) {
        return null;
      }
    }
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

  async mget(...keys: string[]) {
    return keys.map((k) => this.store.get(k) ?? null);
  }

  async scan(cursor: string | number, ...args: any[]) {
    const matchIdx = args.indexOf("MATCH");
    const pattern = matchIdx !== -1 ? args[matchIdx + 1] : "*";
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    const matchedKeys = Array.from(this.store.keys()).filter((k) => regex.test(k));
    return ["0", matchedKeys];
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

  async incr(key: string) {
    const val = this.store.get(key);
    const num = val ? Number.parseInt(val, 10) : 0;
    const next = num + 1;
    this.store.set(key, String(next));
    return next;
  }

  async expire(_key: string, _seconds: number) {
    return 1;
  }

  multi() {
    const queue: (() => Promise<any>)[] = [];
    const chain = {
      zremrangebyscore: (key: string, min: number, max: number) => {
        queue.push(async () => {
          const setKey = `zset:${key}`;
          const current = this.store.get(setKey);
          if (!current) return 0;
          const list = JSON.parse(current) as { member: string; score: number }[];
          const filtered = list.filter((item) => item.score < min || item.score > max);
          this.store.set(setKey, JSON.stringify(filtered));
          return list.length - filtered.length;
        });
        return chain;
      },
      zadd: (key: string, score: number, member: string) => {
        queue.push(async () => {
          const setKey = `zset:${key}`;
          const current = this.store.get(setKey);
          const list = current ? (JSON.parse(current) as { member: string; score: number }[]) : [];
          list.push({ member, score });
          this.store.set(setKey, JSON.stringify(list));
          return 1;
        });
        return chain;
      },
      zcard: (key: string) => {
        queue.push(async () => {
          const setKey = `zset:${key}`;
          const current = this.store.get(setKey);
          const list = current ? (JSON.parse(current) as { member: string; score: number }[]) : [];
          return list.length;
        });
        return chain;
      },
      expire: (_key: string, _seconds: number) => {
        queue.push(async () => 1);
        return chain;
      },
      exec: async () => {
        const results = [];
        for (const fn of queue) {
          results.push([null, await fn()]);
        }
        return results;
      }
    };
    return chain;
  }

  async quit() {}
}
