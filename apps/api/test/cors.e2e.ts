import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { isAllowedBrowserOrigin } from "../src/common/auth/allowed-origins";

describe("CORS E2E", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    // Same contract as main.ts: cors must be set before init() so OPTIONS is handled
    app = moduleRef.createNestApplication({
      cors: {
        origin: (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void
        ) => {
          callback(null, isAllowedBrowserOrigin(origin));
        },
        credentials: true
      }
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("OPTIONS /auth/login answers preflight for allowed origin", async () => {
    const res = await request(app.getHttpServer())
      .options("/auth/login")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    expect(res.status).toBeLessThan(300);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("POST /auth/login includes ACAO for allowed origin", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: "member@kloqra.dev", password: "wrong-password" });

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });
});
