import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { buildSentryEventContext } from "./sentry-context.util";

@Injectable()
@Catch()
export class SentryFilter implements ExceptionFilter {
  constructor(private readonly prisma: PrismaService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<any>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let body: any;
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === "object" && res !== null) {
        body = res;
      } else {
        body = { message: res };
      }
    } else {
      const message = exception instanceof Error ? exception.message : String(exception);
      body = { message };
    }

    const dsn = process.env.SENTRY_DSN;
    if (status >= 500) {
      console.error("[API Error]", exception);
    }
    if (dsn && status >= 500) {
      void this.sendToSentry(dsn, exception, request);
    }

    response.status(status).json({
      ...body,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url
    });
  }

  private async sendToSentry(dsn: string, exception: unknown, request: any) {
    try {
      const match = dsn.match(/https:\/\/([^@]+)@([^/]+)\/(.+)/);
      if (!match) return;
      const [, publicKey, host, projectId] = match;
      const url = `https://${host}/api/${projectId}/store/`;

      const err = exception instanceof Error ? exception : new Error(String(exception));
      const tenantId = request.user?.tenantId as string | undefined;
      let subscriptionStatus: string | null = null;
      if (tenantId) {
        const row = await this.prisma.tenantSubscription.findUnique({
          where: { tenantId },
          select: { status: true }
        });
        subscriptionStatus = row?.status ?? null;
      }

      const { tags, extra } = buildSentryEventContext(request, subscriptionStatus);

      const event = {
        event_id: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString().split(".")[0],
        platform: "node",
        sdk: {
          name: "kloqra-custom-sentry",
          version: "1.0.0"
        },
        logger: "nestjs",
        tags,
        extra,
        exception: {
          values: [
            {
              type: err.name,
              value: err.message,
              stacktrace: {
                frames: this.parseStack(err.stack)
              }
            }
          ]
        },
        request: {
          url: request.protocol + "://" + request.get("host") + request.url,
          method: request.method,
          headers: request.headers
        }
      };

      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=kloqra-custom-sentry/1.0.0, sentry_key=${publicKey}`
        },
        body: JSON.stringify(event)
      });
    } catch (e) {
      console.error("Sentry sending error:", e);
    }
  }

  private parseStack(stack?: string) {
    if (!stack) return [];
    return stack
      .split("\n")
      .slice(1)
      .map((line) => {
        const match =
          line.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/) || line.match(/at\s+(.+):(\d+):(\d+)/);
        if (!match) return { filename: line.trim() };
        if (match.length === 5) {
          return {
            function: match[1],
            filename: match[2],
            lineno: parseInt(match[3]),
            colno: parseInt(match[4])
          };
        }
        return {
          filename: match[1],
          lineno: parseInt(match[2]),
          colno: parseInt(match[3])
        };
      })
      .reverse();
  }
}
