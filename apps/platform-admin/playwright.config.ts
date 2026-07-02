import { defineConfig } from "@playwright/test";

const e2ePath = `${process.cwd()}/../../scripts/bin:${process.env.PATH ?? ""}`;

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3003",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    viewport: { width: 1366, height: 768 }
  },
  webServer: [
    {
      command: "bash ../../scripts/pnpm-wrap.sh --filter @kloqra/api dev",
      url: "http://localhost:3001/api/docs",
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        PATH: e2ePath,
        E2E_DISABLE_AUTH_THROTTLE: "1"
      }
    },
    {
      command: "bash ../../scripts/pnpm-wrap.sh --filter @kloqra/platform-admin dev",
      url: "http://localhost:3003/login",
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        PATH: e2ePath,
        NEXT_PUBLIC_AUTH_SCOPE: "platform",
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"
      }
    }
  ]
});
