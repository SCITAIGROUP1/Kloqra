import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";

describe("Assistant E2E", () => {
  let app: INestApplication;
  let memberSession: Awaited<ReturnType<typeof loginAs>>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    memberSession = await loginAs(app, "member@kloqra.dev");
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns help response for authenticated member", async () => {
    const res = await authedAgent(app, memberSession)
      .post("/assistant/chat")
      .send({
        messages: [{ role: "user", content: "How do I start a timer?" }]
      });

    expect(res.status).toBe(201);
    expect(typeof res.body.reply).toBe("string");
    expect(res.body.reply.length).toBeGreaterThan(0);
    if (res.body.links) {
      expect(Array.isArray(res.body.links)).toBe(true);
    }
  });

  it("rejects unauthenticated chat requests", async () => {
    const res = await request(app.getHttpServer())
      .post("/assistant/chat")
      .send({
        messages: [{ role: "user", content: "Help" }]
      });

    expect(res.status).toBe(401);
  });
});
