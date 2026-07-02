import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import type { NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

type RequestWithContext = Request & {
  requestId: string;
  user?: { userId: string; tenantId: string; workspaceId: string };
};

/** Attaches a unique requestId to every inbound request and logs structured JSON. */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
    const startMs = Date.now();

    (req as RequestWithContext).requestId = requestId;
    res.setHeader("x-request-id", requestId);

    res.on("finish", () => {
      const durationMs = Date.now() - startMs;
      const { method, originalUrl } = req;
      const { statusCode } = res;
      const authReq = req as RequestWithContext;

      const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "log";

      const meta: Record<string, string | number | undefined> = {
        requestId,
        method,
        url: originalUrl,
        statusCode,
        durationMs,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      };

      if (authReq.user?.tenantId) meta.tenantId = authReq.user.tenantId;
      if (authReq.user?.workspaceId) meta.workspaceId = authReq.user.workspaceId;
      if (authReq.user?.userId) meta.userId = authReq.user.userId;

      this.logger[level](JSON.stringify(meta), "HTTP");
    });

    next();
  }
}
