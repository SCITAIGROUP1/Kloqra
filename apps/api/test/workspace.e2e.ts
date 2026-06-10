import { ROUTES, type TeamMembersOverviewDto } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";

describe("Workspace E2E", () => {
  let app: INestApplication;
  let adminSession: Awaited<ReturnType<typeof loginAs>>;
  let memberSession: Awaited<ReturnType<typeof loginAs>>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    adminSession = await loginAs(app, "admin@kloqra.dev");
    memberSession = await loginAs(app, "member@kloqra.dev");
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /workspaces/:id/members/overview returns paginated team overview for admin", async () => {
    const path = `${ROUTES.WORKSPACES.MEMBERS_OVERVIEW(adminSession.workspaceId)}?page=1&limit=20`;
    const res = await authedAgent(app, adminSession).get(path);
    expect(res.status).toBe(200);

    const body = res.body as TeamMembersOverviewDto;
    expect(Array.isArray(body.members)).toBe(true);
    expect(body.members.length).toBeGreaterThan(0);
    expect(body.summary.totalMembers).toBeGreaterThan(0);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
    expect(typeof body.total).toBe("number");
    expect(typeof body.totalPages).toBe("number");
  });

  it("member cannot GET /workspaces/:id/members/overview", async () => {
    const path = `${ROUTES.WORKSPACES.MEMBERS_OVERVIEW(memberSession.workspaceId)}?page=1&limit=20`;
    const res = await authedAgent(app, memberSession).get(path);
    expect(res.status).toBe(403);
  });
});
