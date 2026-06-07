"use client";

import { useEffect } from "react";

export function SentryInitializer() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || (process.env as any).NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;

    const match = dsn.match(/https:\/\/([^@]+)@([^/]+)\/(.+)/);
    if (!match) return;
    const [, publicKey, host, projectId] = match;
    const url = `https://${host}/api/${projectId}/store/`;

    const sendToSentry = async (error: Error, isUnhandledRejection = false) => {
      try {
        const event = {
          event_id:
            Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
          timestamp: new Date().toISOString().split(".")[0],
          platform: "javascript",
          sdk: {
            name: "chronomint-client-sentry",
            version: "1.0.0"
          },
          logger: "javascript",
          exception: {
            values: [
              {
                type: error.name || (isUnhandledRejection ? "UnhandledRejection" : "Error"),
                value: error.message || String(error),
                stacktrace: {
                  frames: error.stack
                    ? error.stack
                        .split("\n")
                        .map((line) => ({ filename: line.trim() }))
                        .reverse()
                    : []
                }
              }
            ]
          },
          request: {
            url: window.location.href,
            headers: {
              "User-Agent": navigator.userAgent
            }
          }
        };

        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=chronomint-client-sentry/1.0.0, sentry_key=${publicKey}`
          },
          body: JSON.stringify(event)
        });
      } catch (err) {
        console.error("Failed to log to Sentry:", err);
      }
    };

    const handleError = (event: ErrorEvent) => {
      sendToSentry(event.error || new Error(event.message));
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      sendToSentry(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        true
      );
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
