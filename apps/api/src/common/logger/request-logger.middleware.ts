import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import type { NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

/** Attaches a unique requestId to every inbound request and logs structured JSON. */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
    const startMs = Date.now();

    // Propagate the requestId so downstream code / guards can reference it
    (req as Request & { requestId: string }).requestId = requestId;
    res.setHeader("x-request-id", requestId);

    res.on("finish", () => {
      const durationMs = Date.now() - startMs;
      const { method, originalUrl } = req;
      const { statusCode } = res;

      const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "log";
      const message = `${method} ${originalUrl} ${statusCode} ${durationMs}ms`;

      const meta = {
        requestId,
        method,
        url: originalUrl,
        statusCode,
        durationMs,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      };

      this.logger[level](JSON.stringify(meta), "HTTP");
      void message; // message already embedded in meta
    });

    next();
  }
}
