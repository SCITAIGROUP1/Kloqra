import { describe, expect, it } from "vitest";
import { adminOrigin, clientOrigin, originForNotificationHref } from "./app-origin.util";

describe("originForNotificationHref", () => {
  it("routes platform tenant paths to platform origin", () => {
    const prev = process.env.PUBLIC_PLATFORM_URL;
    process.env.PUBLIC_PLATFORM_URL = "http://platform.test";
    expect(originForNotificationHref("/tenants/abc")).toBe("http://platform.test");
    expect(originForNotificationHref("/ops")).toBe("http://platform.test");
    if (prev === undefined) delete process.env.PUBLIC_PLATFORM_URL;
    else process.env.PUBLIC_PLATFORM_URL = prev;
  });

  it("routes admin billing paths to admin origin", () => {
    expect(originForNotificationHref("/account/billing")).toBe(adminOrigin());
  });

  it("routes client paths to client origin", () => {
    expect(originForNotificationHref("/dashboard")).toBe(clientOrigin());
  });
});
