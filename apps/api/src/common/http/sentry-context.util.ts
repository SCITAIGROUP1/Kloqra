import type { Request } from "express";

export type SentryRequestUser = {
  userId?: string;
  tenantId?: string;
  workspaceId?: string;
};

export type SentryEventContext = {
  tags: Record<string, string>;
  extra: Record<string, string>;
};

export function buildSentryEventContext(
  request: Request & { requestId?: string; user?: SentryRequestUser },
  subscriptionStatus?: string | null
): SentryEventContext {
  const tags: Record<string, string> = {};
  const extra: Record<string, string> = {};

  if (request.requestId) {
    tags.requestId = request.requestId;
  }

  const user = request.user;
  if (user?.tenantId) {
    tags.tenantId = user.tenantId;
  }
  if (user?.workspaceId) {
    tags.workspaceId = user.workspaceId;
  }
  if (user?.userId) {
    tags.userId = user.userId;
  }
  if (subscriptionStatus) {
    extra.subscriptionStatus = subscriptionStatus;
  }

  return { tags, extra };
}
