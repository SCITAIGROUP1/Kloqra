import { defineConfig } from "@playwright/test";

const e2ePath = `${process.cwd()}/../../scripts/bin:${process.env.PATH ?? ""}`;

const clientDevEnv = {
  NEXT_PUBLIC_AUTH_SCOPE: "client",
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
  NEXT_PUBLIC_HARD_AUTO_STOP_HOURS: process.env.NEXT_PUBLIC_HARD_AUTO_STOP_HOURS ?? "12"
};

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60_000,
  retries: 2,
  reporter: [
    ["list"],
    ["junit", { outputFile: "test-results/playwright-junit.xml" }],
    ["html", { open: "never" }]
  ],
  projects: [
    { name: "setup-admin", testMatch: /auth\.admin\.setup\.ts/ },
    { name: "setup-member", testMatch: /auth\.member\.setup\.ts/ },
    { name: "setup-drew", testMatch: /auth\.drew\.setup\.ts/ },
    {
      name: "e2e",
      testIgnore: [
        /auth\./,
        /smoke\.spec\.ts/,
        /impersonation\.spec\.ts/,
        /submissions\.spec\.ts/,
        /screenshot\.spec\.ts/,
        /session-boundary\.spec\.ts/,
        /admin-client-timelog-sync\.spec\.ts/
      ],
      dependencies: ["setup-member"],
      use: {
        storageState: "e2e/.auth/member.json"
      }
    },
    {
      name: "submissions",
      testMatch: /submissions\.spec\.ts/,
      dependencies: ["setup-drew"],
      use: {
        storageState: "e2e/.auth/drew.json"
      }
    },
    {
      name: "impersonation",
      testMatch: /impersonation\.spec\.ts/,
      dependencies: ["setup-admin"],
      use: {
        storageState: "e2e/.auth/admin.json",
        baseURL: process.env.ADMIN_BASE_URL ?? "http://localhost:3002"
      }
    },
    {
      name: "smoke",
      testMatch: /smoke\.spec\.ts/,
      use: { storageState: { cookies: [], origins: [] } }
    },
    {
      name: "session-boundary",
      testMatch: /session-boundary\.spec\.ts/,
      use: { storageState: { cookies: [], origins: [] } }
    },
    {
      name: "admin-client-sync",
      testMatch: /admin-client-timelog-sync\.spec\.ts/,
      use: { storageState: { cookies: [], origins: [] } }
    }
  ],
  use: {
    baseURL: "http://localhost:3000",
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
        NODE_ENV: "development",
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
        NEXT_PUBLIC_API_BASE_URL: clientDevEnv.NEXT_PUBLIC_API_BASE_URL
      }
    },
    {
      command: "bash ../../scripts/pnpm-wrap.sh --filter @kloqra/client dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        ...clientDevEnv,
        PATH: e2ePath
      }
    }
  ]
});
