import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";

describe("Users E2E", () => {
  let app: INestApplication;
  let session: Awaited<ReturnType<typeof loginAs>>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    session = await loginAs(app, "member@chronomint.dev");
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /users/me returns profile", async () => {
    const res = await authedAgent(app, session).get("/users/me");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("member@chronomint.dev");
    expect(res.body.effectiveDailyTargetHours).toBeGreaterThan(0);
  });

  it("PATCH /users/me/preferences updates daily target", async () => {
    const res = await authedAgent(app, session)
      .patch("/users/me/preferences")
      .send({ dailyTargetHours: 5.5 });
    expect(res.status).toBe(200);
    expect(res.body.preferences.dailyTargetHours).toBe(5.5);
    expect(res.body.effectiveDailyTargetHours).toBe(5.5);
  });

  it("PATCH /users/me updates display name", async () => {
    const res = await authedAgent(app, session).patch("/users/me").send({ name: "Sam Rivera" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Sam Rivera");
  });

  it("POST /users/me/password rejects wrong current password", async () => {
    const res = await authedAgent(app, session).post("/users/me/password").send({
      currentPassword: "wrong-password",
      newPassword: "newpassword1"
    });
    expect(res.status).toBe(401);
  });

  it("member cannot PATCH workspace settings", async () => {
    const res = await authedAgent(app, session)
      .patch(`/workspaces/${session.workspaceId}`)
      .send({ settings: { dailyTargetHours: 10 } });
    expect(res.status).toBe(403);
  });
});
