import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from "express";

@Catch()
export class SentryFilter implements ExceptionFilter {
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

    // Log to Sentry if DSN is set and it's a 5xx error
    const dsn = process.env.SENTRY_DSN;
    if (dsn && status >= 500) {
      this.sendToSentry(dsn, exception, request).catch((err) => {
        console.error("Failed to send error to Sentry:", err);
      });
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

      const event = {
        event_id: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString().split(".")[0],
        platform: "node",
        sdk: {
          name: "chronomint-custom-sentry",
          version: "1.0.0"
        },
        logger: "nestjs",
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
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=chronomint-custom-sentry/1.0.0, sentry_key=${publicKey}`
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
