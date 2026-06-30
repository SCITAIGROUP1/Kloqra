import { defineConfig } from "@playwright/test";

const e2ePath = `${process.cwd()}/../../scripts/bin:${process.env.PATH ?? ""}`;

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60_000,
  reporter: [
    ["list"],
    ["junit", { outputFile: "test-results/playwright-junit.xml" }],
    ["html", { open: "never" }]
  ],
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "e2e",
      testIgnore: [/auth\.setup\.ts/, /smoke\.spec\.ts/],
      dependencies: ["setup"],
      use: {
        storageState: "e2e/.auth/admin.json"
      }
    },
    {
      name: "smoke",
      testMatch: /smoke\.spec\.ts/,
      use: { storageState: { cookies: [], origins: [] } }
    }
  ],
  use: {
    baseURL: "http://localhost:3002",
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
      command: "bash ../../scripts/pnpm-wrap.sh --filter @kloqra/admin dev",
      url: "http://localhost:3002/login",
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        PATH: e2ePath,
        NEXT_PUBLIC_AUTH_SCOPE: "admin",
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"
      }
    }
  ]
});
