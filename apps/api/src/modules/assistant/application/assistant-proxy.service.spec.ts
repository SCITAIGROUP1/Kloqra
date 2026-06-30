import { assistantChatResponseSchema } from "@kloqra/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAssistantFallbackReply } from "./assistant-fallback";
import { AssistantProxyService } from "./assistant-proxy.service";

describe("AssistantProxyService", () => {
  const originalEnv = { ...process.env };
  let mockRedisClient: any;
  let mockRedisService: any;

  beforeEach(() => {
    mockRedisClient = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(true),
      del: vi.fn().mockResolvedValue(true)
    };
    mockRedisService = {
      getClient: () => mockRedisClient
    } as any;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("returns fallback when assistant is disabled", async () => {
    process.env.ASSISTANT_ENABLED = "false";
    const service = new AssistantProxyService(mockRedisService);
    const result = await service.chat(
      { messages: [{ role: "user", content: "How do I start a timer?" }] },
      {}
    );
    expect(result.links?.some((l) => l.href === "/timer")).toBe(true);
    expect(result.reply).toContain("unavailable");
  });

  it("returns fallback when internal secret is missing", async () => {
    process.env.ASSISTANT_ENABLED = "true";
    delete process.env.ASSISTANT_INTERNAL_SECRET;
    const service = new AssistantProxyService(mockRedisService);
    const result = await service.chat({ messages: [{ role: "user", content: "Help" }] }, {});
    expect(result.reply).toContain("unavailable");
  });

  it("returns parsed response when Python service succeeds", async () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.ASSISTANT_INTERNAL_SECRET = "secret";
    process.env.ASSISTANT_SERVICE_URL = "http://assistant.test";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          reply: "Open Timer and click Start.",
          links: [{ label: "Timer", href: "/timer" }]
        })
      })
    );

    const service = new AssistantProxyService(mockRedisService);
    const result = await service.chat(
      { messages: [{ role: "user", content: "timer?" }] },
      { userDisplayName: "Alex" }
    );

    expect(result.reply).toContain("Timer");
    expect(fetch).toHaveBeenCalledWith(
      "http://assistant.test/internal/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-Assistant-Secret": "secret" })
      })
    );
  });

  it("returns fallback when Python service errors", async () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.ASSISTANT_INTERNAL_SECRET = "secret";

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const service = new AssistantProxyService(mockRedisService);
    const result = await service.chat({ messages: [{ role: "user", content: "Help" }] }, {});
    expect(result.reply).toContain("unavailable");
  });

  it("fallback reply schema matches assistantChatResponseSchema", () => {
    const fallback = buildAssistantFallbackReply();
    const parsed = assistantChatResponseSchema.safeParse(fallback);
    expect(parsed.success).toBe(true);
  });

  it("circuit breaker windowed: opens circuit after 3 failures", async () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.ASSISTANT_INTERNAL_SECRET = "secret";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network Error")));

    let failureCount = 0;
    mockRedisClient.incr.mockImplementation(async () => {
      failureCount += 1;
      return failureCount;
    });

    let openUntilVal: string | null = null;
    mockRedisClient.set.mockImplementation(async (key, val) => {
      openUntilVal = val;
      return "OK";
    });
    mockRedisClient.get.mockImplementation(async () => openUntilVal);

    const service = new AssistantProxyService(mockRedisService);

    // First request fails
    await service.chat({ messages: [] }, {});
    expect(failureCount).toBe(1);
    expect(openUntilVal).toBeNull();

    // Second request fails
    await service.chat({ messages: [] }, {});
    expect(failureCount).toBe(2);
    expect(openUntilVal).toBeNull();

    // Third request fails -> Circuit should open
    await service.chat({ messages: [] }, {});
    expect(failureCount).toBe(3);
    expect(openUntilVal).not.toBeNull();

    // Fourth request should immediately use fallback without hitting fetch
    vi.stubGlobal("fetch", vi.fn());
    const result = await service.chat({ messages: [] }, {});
    expect(result.reply).toContain("unavailable");
    expect(fetch).not.toHaveBeenCalled();
  });
});
