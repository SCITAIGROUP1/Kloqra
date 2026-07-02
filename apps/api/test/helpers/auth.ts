import type { INestApplication } from "@nestjs/common";
import request from "supertest";

export interface LoginSession {
  accessToken: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  role: "ADMIN" | "MEMBER";
}

type RequestChain = ReturnType<ReturnType<typeof request>["get"]>;

export async function loginAs(
  app: INestApplication,
  email: string,
  password = "password123"
): Promise<LoginSession> {
  const res = await request(app.getHttpServer()).post("/auth/login").send({ email, password });
  if (res.status !== 201) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return {
    accessToken: res.body.accessToken,
    tenantId: res.body.tenantId,
    workspaceId: res.body.workspaceId,
    userId: res.body.user.id,
    role: res.body.workspaceRole
  };
}

function withAuthHeaders(
  chain: RequestChain,
  session: Pick<LoginSession, "accessToken" | "workspaceId">
): RequestChain {
  return chain
    .set("Authorization", `Bearer ${session.accessToken}`)
    .set("X-Workspace-Id", session.workspaceId);
}

export function authedAgent(
  app: INestApplication,
  session: Pick<LoginSession, "accessToken" | "workspaceId">
) {
  const server = app.getHttpServer();
  return {
    get: (url: string) => withAuthHeaders(request(server).get(url), session),
    post: (url: string) => withAuthHeaders(request(server).post(url), session),
    patch: (url: string) => withAuthHeaders(request(server).patch(url), session),
    del: (url: string) => withAuthHeaders(request(server).delete(url), session)
  };
}
