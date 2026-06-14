import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantProxyService } from "./assistant-proxy.service";

describe("AssistantProxyService", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("returns fallback when assistant is disabled", async () => {
    process.env.ASSISTANT_ENABLED = "false";
    const service = new AssistantProxyService();
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
    const service = new AssistantProxyService();
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

    const service = new AssistantProxyService();
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

    const service = new AssistantProxyService();
    const result = await service.chat({ messages: [{ role: "user", content: "Help" }] }, {});
    expect(result.reply).toContain("unavailable");
  });
});
